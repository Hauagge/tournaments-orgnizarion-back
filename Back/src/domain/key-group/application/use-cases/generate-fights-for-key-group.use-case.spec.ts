import { beforeEach, describe, expect, it } from 'vitest';
import { AreaQueueItemStatus } from '@/domain/area/domain/value-objects/area-queue-item-status.enum';
import { Competition } from '@/domain/competition/domain/entities/competition.entity';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { FightGenerationStrategyResolverService } from '@/domain/fight/application/services/fight-generation-strategy-resolver.service';
import { AbsoluteGpFightGenerationStrategy } from '@/domain/fight/application/strategies/absolute-gp-fight-generation.strategy';
import { FightEntity } from '@/domain/fight/domain/entities/fight.entity';
import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';
import { IFightRepository } from '@/domain/fight/repository/IFightRepository.repository';
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
import { FourAthleteOlympicBracketFightGenerationStrategy } from '../strategies/four-athlete-olympic-bracket-fight-generation.strategy';
import { KeysFightGenerationStrategy } from '../strategies/keys-fight-generation.strategy';
import { GenerateFightsForKeyGroupUseCase } from './generate-fights-for-key-group.use-case';

class InMemoryCompetitionRepository implements ICompetitionRepository {
  constructor(private readonly competitions: Competition[]) {}

  async create(competition: Competition): Promise<Competition> {
    return competition;
  }

  async update(competition: Competition): Promise<Competition> {
    return competition;
  }

  async findById(id: number): Promise<Competition | null> {
    return this.competitions.find((competition) => competition.id === id) ?? null;
  }

  async list(): Promise<[Competition[], number]> {
    return [this.competitions, this.competitions.length];
  }

  async listDashboardSummary(): Promise<any[]> {
    return [];
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

  constructor(private fights: FightEntity[] = []) {}

  async create(fight: FightEntity): Promise<FightEntity> {
    const [saved] = await this.createMany([fight]);
    return saved;
  }

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

  async updateMany(fights: FightEntity[]): Promise<FightEntity[]> {
    for (const fight of fights) {
      await this.update(fight);
    }
    return fights;
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

  async listByCategoryId(): Promise<FightEntity[]> {
    return [];
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

  async delete(id: number): Promise<void> {
    this.fights = this.fights.filter((fight) => fight.id !== id);
  }
}

class DistributeAreaFightsUseCaseStub {
  public calls: unknown[] = [];

  async execute(input: unknown): Promise<void> {
    this.calls.push(input);
  }
}

function makeGroup(id: number) {
  return KeyGroup.restore({
    id,
    competitionId: 1,
    categoryId: 10,
    name: 'Chave A',
    status: KeyGroupStatus.READY,
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

describe('GenerateFightsForKeyGroupUseCase', () => {
  let fightRepository: InMemoryFightRepository;
  let distributeAreaFightsUseCase: DistributeAreaFightsUseCaseStub;
  let useCase: GenerateFightsForKeyGroupUseCase;

  beforeEach(() => {
    fightRepository = new InMemoryFightRepository();
    distributeAreaFightsUseCase = new DistributeAreaFightsUseCaseStub();
    useCase = new GenerateFightsForKeyGroupUseCase(
      new InMemoryCompetitionRepository([
        makeCompetition({ id: 1, mode: CompetitionMode.KEYS }),
      ]),
      new InMemoryKeyGroupRepository(
        [makeGroup(20)],
        [
          makeMember({ id: 1, keyGroupId: 20, athleteId: 101 }),
          makeMember({ id: 2, keyGroupId: 20, athleteId: 102 }),
        ],
      ),
      fightRepository,
      new FightGenerationStrategyResolverService(
        new AbsoluteGpFightGenerationStrategy(),
        new KeysFightGenerationStrategy(
          new FourAthleteOlympicBracketFightGenerationStrategy(),
        ),
      ),
      distributeAreaFightsUseCase as any,
    );
  });

  it('generates two active persisted fights for a two-athlete best-of-three key group', async () => {
    const result = await useCase.execute(20);

    expect(result.metadata).toEqual([
      expect.objectContaining({
        categoryId: 10,
        format: 'BEST_OF_THREE',
      }),
    ]);
    expect(result.fights).toHaveLength(2);
    expect(result.fights).toEqual([
      expect.objectContaining({
        id: 100,
        keyGroupId: 20,
        athleteAId: 101,
        athleteBId: 102,
        orderIndex: 1,
      }),
      expect.objectContaining({
        id: 101,
        keyGroupId: 20,
        athleteAId: 101,
        athleteBId: 102,
        orderIndex: 2,
      }),
    ]);
    expect(distributeAreaFightsUseCase.calls).toEqual([
      expect.objectContaining({
        competitionId: 1,
        fightIds: [100, 101],
      }),
    ]);
  });
});
