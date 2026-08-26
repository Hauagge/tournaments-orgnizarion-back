import { beforeEach, describe, expect, it } from 'vitest';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { FightEntity } from '@/domain/fight/domain/entities/fight.entity';
import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { makeCompetition } from '../../../../../test/factories';
import {
  InMemoryCompetitionRepository,
  InMemoryFightRepository,
  InMemoryKeyGroupRepository,
} from '../../../../../test/repositories/in-memory';
import { KeyGroup } from '../../domain/entities/key-group.entity';
import { KeyGroupMember } from '../../domain/entities/key-group-member.entity';
import { KeyGroupStatus } from '../../domain/value-objects/key-group-status.enum';
import { CreateFightForKeyGroupUseCase } from './create-fight-for-key-group.use-case';

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
      competitionId: 1,
      categoryId: 10,
      keyGroupId: 20,
      athleteAId: 101,
      athleteBId: 102,
      status: FightStatus.WAITING,
    });
    expect(fight.orderIndex).toBe(1);
    expect(distributeAreaFightsUseCase.calls).toEqual([
      {
        competitionId: 1,
        mode: 'INCREMENTAL',
        restGapFights: 2,
        fightIds: [fight.id],
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

    expect(fight.id).toEqual(expect.any(Number));
  });
});
