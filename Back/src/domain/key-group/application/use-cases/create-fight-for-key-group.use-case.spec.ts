import { beforeEach, describe, expect, it } from 'vitest';
import { Competition } from '@/domain/competition/domain/entities/competition.entity';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { FightEntity } from '@/domain/fight/domain/entities/fight.entity';
import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';
import { IFightRepository } from '@/domain/fight/repository/IFightRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { makeCompetition } from '../../../../../test/factories';
import { KeyGroup } from '../../domain/entities/key-group.entity';
import { KeyGroupMember } from '../../domain/entities/key-group-member.entity';
import { KeyGroupStatus } from '../../domain/value-objects/key-group-status.enum';
import {
  IKeyGroupRepository,
  KeyGroupDetailsView,
  KeyGroupListItemView,
  KeyGroupReportView,
} from '../../repository/IKeyGroupRepository.repository';
import { CreateFightForKeyGroupUseCase } from './create-fight-for-key-group.use-case';

class InMemoryCompetitionRepository implements ICompetitionRepository {
  constructor(private readonly competitions: Competition[]) {}

  async create(competition: Competition): Promise<Competition> {
    return competition;
  }

  async update(competition: Competition): Promise<Competition> {
    return competition;
  }

  async findById(id: number): Promise<Competition | null> {
    return (
      this.competitions.find((competition) => competition.id === id) ?? null
    );
  }

  async list(): Promise<[Competition[], number]> {
    return [this.competitions, this.competitions.length];
  }
}

class InMemoryKeyGroupRepository implements IKeyGroupRepository {
  constructor(
    private readonly groups: KeyGroup[],
    private readonly members: KeyGroupMember[],
  ) {}

  async create(group: KeyGroup): Promise<KeyGroup> {
    return group;
  }

  async update(group: KeyGroup): Promise<KeyGroup> {
    return group;
  }

  async findById(id: number): Promise<KeyGroup | null> {
    return this.groups.find((group) => group.id === id) ?? null;
  }

  async listByCompetitionId(): Promise<KeyGroupListItemView[]> {
    return [];
  }

  async getDetails(): Promise<KeyGroupDetailsView | null> {
    return null;
  }

  async listReportByCompetitionId(): Promise<KeyGroupReportView[]> {
    return [];
  }

  async listMembersByKeyGroupId(keyGroupId: number): Promise<KeyGroupMember[]> {
    return this.members.filter((member) => member.keyGroupId === keyGroupId);
  }

  async findByCompetitionIdAndAthleteId(): Promise<KeyGroup | null> {
    return null;
  }

  async addMember(
    keyGroupId: number,
    athleteId: number,
  ): Promise<KeyGroupMember> {
    return KeyGroupMember.restore({
      id: 1,
      keyGroupId,
      athleteId,
      createdAt: new Date('2026-01-10T00:00:00.000Z'),
    });
  }

  async removeMember(): Promise<void> {
    return;
  }
}

class InMemoryFightRepository implements IFightRepository {
  private nextId = 100;

  constructor(private fights: FightEntity[]) {}

  async createMany(fights: FightEntity[]): Promise<FightEntity[]> {
    const saved = fights.map((fight) =>
      FightEntity.restore({
        ...fight.toJSON(),
        id: this.nextId++,
      }),
    );
    this.fights = [...this.fights, ...saved];
    return saved;
  }

  async update(fight: FightEntity): Promise<FightEntity> {
    this.fights = this.fights.map((current) =>
      current.id === fight.id ? fight : current,
    );
    return fight;
  }

  async findById(id: number): Promise<FightEntity | null> {
    return this.fights.find((fight) => fight.id === id) ?? null;
  }

  async listByCompetitionId(input: {
    competitionId: number;
    status?: FightStatus;
  }): Promise<FightEntity[]> {
    return this.fights.filter(
      (fight) =>
        fight.competitionId === input.competitionId &&
        (input.status ? fight.status === input.status : true),
    );
  }

  async listByKeyGroupId(keyGroupId: number): Promise<FightEntity[]> {
    return this.fights.filter((fight) => fight.keyGroupId === keyGroupId);
  }

  async listQueueByAreaId(areaId: number): Promise<FightEntity[]> {
    return this.fights.filter((fight) => fight.areaId === areaId);
  }

  async assignAreas(): Promise<void> {
    return;
  }

  async updateOrder(): Promise<void> {
    return;
  }

  async countByCompetitionId(competitionId: number): Promise<number> {
    return this.fights.filter((fight) => fight.competitionId === competitionId)
      .length;
  }
}

class DistributeAreaFightsUseCaseStub {
  public calls: unknown[] = [];

  async execute(input: unknown): Promise<void> {
    this.calls.push(input);
  }
}

function makeGroup(input: {
  id: number;
  competitionId?: number;
  categoryId?: number | null;
  status?: KeyGroupStatus;
}) {
  return KeyGroup.restore({
    id: input.id,
    competitionId: input.competitionId ?? 1,
    categoryId: input.categoryId ?? 10,
    name: 'Chave A',
    status: input.status ?? KeyGroupStatus.READY,
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
  });
}

function makeMember(input: { id: number; keyGroupId: number; athleteId: number }) {
  return KeyGroupMember.restore({
    id: input.id,
    keyGroupId: input.keyGroupId,
    athleteId: input.athleteId,
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
  });
}

function makeFight(input: {
  id: number;
  keyGroupId: number;
  athleteAId: number;
  athleteBId: number;
  areaId?: number | null;
  status?: FightStatus;
  orderIndex?: number;
}) {
  return FightEntity.restore({
    id: input.id,
    competitionId: 1,
    categoryId: 10,
    keyGroupId: input.keyGroupId,
    areaId: input.areaId ?? null,
    areaName: input.areaId ? `Area ${input.areaId}` : null,
    status: input.status ?? FightStatus.WAITING,
    athleteAId: input.athleteAId,
    athleteBId: input.athleteBId,
    winnerAthleteId: null,
    winType: null,
    startedAt: null,
    finishedAt: null,
    orderIndex: input.orderIndex ?? 1,
  });
}

describe('CreateFightForKeyGroupUseCase', () => {
  let competitionRepository: InMemoryCompetitionRepository;
  let keyGroupRepository: InMemoryKeyGroupRepository;
  let fightRepository: InMemoryFightRepository;
  let distributeAreaFightsUseCase: DistributeAreaFightsUseCaseStub;
  let useCase: CreateFightForKeyGroupUseCase;

  beforeEach(() => {
    competitionRepository = new InMemoryCompetitionRepository([
      makeCompetition({ id: 1, mode: CompetitionMode.KEYS }),
    ]);
    keyGroupRepository = new InMemoryKeyGroupRepository(
      [makeGroup({ id: 20, competitionId: 1, categoryId: 10 })],
      [
        makeMember({ id: 1, keyGroupId: 20, athleteId: 101 }),
        makeMember({ id: 2, keyGroupId: 20, athleteId: 102 }),
        makeMember({ id: 3, keyGroupId: 20, athleteId: 103 }),
      ],
    );
    fightRepository = new InMemoryFightRepository([]);
    distributeAreaFightsUseCase = new DistributeAreaFightsUseCaseStub();
    useCase = new CreateFightForKeyGroupUseCase(
      competitionRepository,
      keyGroupRepository,
      fightRepository,
      distributeAreaFightsUseCase as any,
    );
  });

  it('creates a fight for two athletes from the key group', async () => {
    const fight = await useCase.execute({
      keyGroupId: 20,
      athleteAId: 101,
      athleteBId: 102,
    });

    expect(fight.toJSON()).toMatchObject({
      id: 100,
      competitionId: 1,
      categoryId: 10,
      keyGroupId: 20,
      athleteAId: 101,
      athleteBId: 102,
      orderIndex: 1,
      status: FightStatus.WAITING,
    });
    expect(distributeAreaFightsUseCase.calls).toEqual([
      {
        competitionId: 1,
        mode: 'INCREMENTAL',
        restGapFights: 2,
        fightIds: [100],
      },
    ]);
  });

  it('uses the next order index when the key group already has fights', async () => {
    fightRepository = new InMemoryFightRepository([
      makeFight({
        id: 10,
        keyGroupId: 20,
        athleteAId: 101,
        athleteBId: 103,
        orderIndex: 4,
      }),
    ]);
    useCase = new CreateFightForKeyGroupUseCase(
      competitionRepository,
      keyGroupRepository,
      fightRepository,
      distributeAreaFightsUseCase as any,
    );

    const fight = await useCase.execute({
      keyGroupId: 20,
      athleteAId: 101,
      athleteBId: 102,
    });

    expect(fight.orderIndex).toBe(5);
  });

  it('infers the area from existing fights in the same key group', async () => {
    fightRepository = new InMemoryFightRepository([
      makeFight({
        id: 10,
        keyGroupId: 20,
        athleteAId: 101,
        athleteBId: 103,
        areaId: 7,
        orderIndex: 4,
      }),
    ]);
    useCase = new CreateFightForKeyGroupUseCase(
      competitionRepository,
      keyGroupRepository,
      fightRepository,
      distributeAreaFightsUseCase as any,
    );

    const fight = await useCase.execute({
      keyGroupId: 20,
      athleteAId: 101,
      athleteBId: 102,
    });

    expect(fight.areaId).toBe(7);
    expect(distributeAreaFightsUseCase.calls).toEqual([]);
  });

  it('throws when the key group does not exist', async () => {
    await expect(() =>
      useCase.execute({
        keyGroupId: 999,
        athleteAId: 101,
        athleteBId: 102,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws when competition is not in keys mode', async () => {
    competitionRepository = new InMemoryCompetitionRepository([
      makeCompetition({ id: 1, mode: CompetitionMode.ABSOLUTE_GP }),
    ]);
    useCase = new CreateFightForKeyGroupUseCase(
      competitionRepository,
      keyGroupRepository,
      fightRepository,
      distributeAreaFightsUseCase as any,
    );

    await expect(() =>
      useCase.execute({
        keyGroupId: 20,
        athleteAId: 101,
        athleteBId: 102,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws when one athlete does not belong to the key group', async () => {
    await expect(() =>
      useCase.execute({
        keyGroupId: 20,
        athleteAId: 101,
        athleteBId: 999,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws when a non-canceled fight already exists for the same athletes', async () => {
    fightRepository = new InMemoryFightRepository([
      makeFight({
        id: 10,
        keyGroupId: 20,
        athleteAId: 102,
        athleteBId: 101,
      }),
    ]);
    useCase = new CreateFightForKeyGroupUseCase(
      competitionRepository,
      keyGroupRepository,
      fightRepository,
      distributeAreaFightsUseCase as any,
    );

    await expect(() =>
      useCase.execute({
        keyGroupId: 20,
        athleteAId: 101,
        athleteBId: 102,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('allows recreating a canceled fight for the same athletes', async () => {
    fightRepository = new InMemoryFightRepository([
      makeFight({
        id: 10,
        keyGroupId: 20,
        athleteAId: 102,
        athleteBId: 101,
        status: FightStatus.CANCELED,
      }),
    ]);
    useCase = new CreateFightForKeyGroupUseCase(
      competitionRepository,
      keyGroupRepository,
      fightRepository,
      distributeAreaFightsUseCase as any,
    );

    const fight = await useCase.execute({
      keyGroupId: 20,
      athleteAId: 101,
      athleteBId: 102,
    });

    expect(fight.id).toBe(100);
  });
});
