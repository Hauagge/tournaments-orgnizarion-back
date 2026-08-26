import { EventBus } from '@/core/events/event-bus.interface';
import { Area } from '@/domain/area/domain/entities/area.entity';
import { AreaQueueItem } from '@/domain/area/domain/entities/area-queue-item.entity';
import { AreaQueueItemStatus } from '@/domain/area/domain/value-objects/area-queue-item-status.enum';
import { AreaQueueFightDetails } from '@/domain/area/repository/area-queue-fight-details.type';
import { IAreaQueueItemRepository } from '@/domain/area/repository/IAreaQueueItemRepository.repository';
import { IAreaRepository } from '@/domain/area/repository/IAreaRepository.repository';
import { Athlete } from '@/domain/athlete/domain/entities/athlete.entity';
import { Competition } from '@/domain/competition/domain/entities/competition.entity';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { FightEntity } from '@/domain/fight/domain/entities/fight.entity';
import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';
import { makeAthlete, makeCompetition } from '../../../../../test/factories';
import {
  InMemoryAthleteRepository,
  InMemoryCompetitionRepository,
  InMemoryFightRepository,
} from '../../../../../test/repositories/in-memory';
import { ValidationError } from '@/shared/errors/validation.error';
import { AreaDistributionStrategyResolverService } from '../services/area-distribution-strategy-resolver.service';
import { FightQueuePlannerService } from '../services/fight-queue-planner.service';
import { FightQueueWriterService } from '../services/fight-queue-writer.service';
import { RestPolicyService } from '../services/rest-policy.service';
import { KeysAreaDistributionStrategy } from '../strategies/keys-area-distribution.strategy';
import { SplitByAgeStrategy } from '../strategies/split-by-age.strategy';
import { DistributionMode } from '../value-objects/distribution-mode.enum';
import { DistributeAreaFightsUseCase } from './distribute-area-fights.use-case';

class InMemoryAreaRepository
  implements IAreaRepository, IAreaQueueItemRepository
{
  constructor(
    private areas: Area[] = [],
    private queueItems: AreaQueueItem[] = [],
  ) {}

  async createMany(areas: Area[]): Promise<Area[]> {
    this.areas = [...this.areas, ...areas];
    return areas;
  }

  async findById(id: number): Promise<Area | null> {
    return this.areas.find((area) => area.id === id) ?? null;
  }

  async listByCompetitionId(competitionId: number): Promise<Area[]> {
    return this.areas.filter((area) => area.competitionId === competitionId);
  }

  async createManyQueueItems(items: AreaQueueItem[]): Promise<AreaQueueItem[]> {
    this.queueItems = [...this.queueItems, ...items];
    return items;
  }

  async replaceForCompetition(input: {
    competitionId: number;
    items: AreaQueueItem[];
  }): Promise<AreaQueueItem[]> {
    const areaIds = new Set(
      this.areas
        .filter((area) => area.competitionId === input.competitionId)
        .map((area) => area.id as number),
    );

    this.queueItems = this.queueItems.filter(
      (item) => !areaIds.has(item.areaId),
    );
    this.queueItems.push(...input.items);

    return input.items;
  }

  async listByAreaId(areaId: number): Promise<AreaQueueItem[]> {
    return this.queueItems
      .filter((item) => item.areaId === areaId)
      .sort((left, right) => left.position - right.position);
  }

  async listByAreaIds(areaIds: number[]): Promise<AreaQueueItem[]> {
    const allowedIds = new Set(areaIds);
    return this.queueItems
      .filter((item) => allowedIds.has(item.areaId))
      .sort((left, right) => left.position - right.position);
  }

  async replaceForAreas(input: {
    areaIds: number[];
    items: AreaQueueItem[];
  }): Promise<AreaQueueItem[]> {
    const areaIds = new Set(input.areaIds);
    this.queueItems = this.queueItems.filter(
      (item) => !areaIds.has(item.areaId),
    );
    this.queueItems.push(...input.items);

    return input.items;
  }

  async listFightDetailsByAreaId(
    _areaId: number,
  ): Promise<AreaQueueFightDetails[]> {
    return [];
  }

  async findByFightId(fightId: number): Promise<AreaQueueItem | null> {
    return this.queueItems.find((item) => item.fightId === fightId) ?? null;
  }

  async update(item: AreaQueueItem): Promise<AreaQueueItem> {
    this.queueItems = this.queueItems.map((current) =>
      current.id === item.id ? item : current,
    );
    return item;
  }
}

class InMemoryEventBus implements EventBus {
  async publish(): Promise<void> {
    return;
  }

  subscribe(): () => void {
    return () => undefined;
  }
}

function makeArea(id: number, competitionId = 1, order = 1) {
  return Area.restore({
    id,
    competitionId,
    name: `Area ${id}`,
    order,
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
  });
}

function makeFight(input: {
  id: number;
  competitionId?: number;
  categoryId?: number | null;
  keyGroupId?: number | null;
  areaId?: number | null;
  status?: FightStatus;
  athleteAId?: number;
  athleteBId?: number;
  orderIndex?: number;
}) {
  return FightEntity.restore({
    id: input.id,
    competitionId: input.competitionId ?? 1,
    categoryId: input.categoryId ?? 1,
    keyGroupId: input.keyGroupId ?? 10,
    areaId: input.areaId ?? null,
    areaName: input.areaId ? `Area ${input.areaId}` : null,
    status: input.status ?? FightStatus.WAITING,
    athleteAId: input.athleteAId ?? 1,
    athleteBId: input.athleteBId ?? 2,
    winnerAthleteId: null,
    winType: null,
    startedAt:
      input.status === FightStatus.IN_PROGRESS
        ? new Date('2026-05-15T10:00:00.000Z')
        : null,
    finishedAt: null,
    orderIndex: input.orderIndex ?? 1,
  });
}

describe('DistributeAreaFightsUseCase', () => {
  function makeSut(input: {
    fights: FightEntity[];
    queueItems?: AreaQueueItem[];
    areas?: Area[];
    athletes?: Athlete[];
    competition?: Competition;
  }) {
    const competitionRepository = new InMemoryCompetitionRepository([
      input.competition ??
        makeCompetition({
          id: 1,
          mode: CompetitionMode.KEYS,
          ageSplitYears: 2,
        }),
    ]);
    const areaRepository = new InMemoryAreaRepository(
      input.areas ?? [makeArea(1, 1, 1)],
      input.queueItems ?? [],
    );
    const fightRepository = new InMemoryFightRepository(input.fights);
    const athleteRepository = new InMemoryAthleteRepository(
      input.athletes ?? [
        makeAthlete({ id: 1, competitionId: 1, fullName: 'A1' }),
        makeAthlete({ id: 2, competitionId: 1, fullName: 'A2' }),
      ],
    );
    const planner = new FightQueuePlannerService(
      new AreaDistributionStrategyResolverService(
        new SplitByAgeStrategy(),
        new KeysAreaDistributionStrategy(),
      ),
      new RestPolicyService(),
    );
    const writer = new FightQueueWriterService(fightRepository, areaRepository);

    const useCase = new DistributeAreaFightsUseCase(
      competitionRepository,
      areaRepository,
      areaRepository,
      fightRepository,
      athleteRepository,
      planner,
      writer,
      new InMemoryEventBus(),
    );

    return { useCase, areaRepository, fightRepository };
  }

  it('should reject FULL distribution when there is a CALLED fight', async () => {
    const { useCase } = makeSut({
      fights: [makeFight({ id: 1, status: FightStatus.CALLED, areaId: 1 })],
    });

    await expect(
      useCase.execute({
        competitionId: 1,
        mode: DistributionMode.FULL,
        restGapFights: 2,
      }),
    ).rejects.toThrow(
      new ValidationError(
        'Full distribution is blocked while there are called or in-progress fights',
      ),
    );
  });

  it('should reject FULL distribution when there is an IN_PROGRESS fight', async () => {
    const { useCase } = makeSut({
      fights: [
        makeFight({ id: 1, status: FightStatus.IN_PROGRESS, areaId: 1 }),
      ],
    });

    await expect(
      useCase.execute({
        competitionId: 1,
        mode: DistributionMode.FULL,
        restGapFights: 2,
      }),
    ).rejects.toThrow(
      new ValidationError(
        'Full distribution is blocked while there are called or in-progress fights',
      ),
    );
  });

  it('should reject INCREMENTAL distribution when targeted fight is CALLED or IN_PROGRESS', async () => {
    const { useCase } = makeSut({
      fights: [
        makeFight({ id: 1, status: FightStatus.CALLED, areaId: 1 }),
        makeFight({ id: 2, status: FightStatus.WAITING }),
      ],
    });

    await expect(
      useCase.execute({
        competitionId: 1,
        mode: DistributionMode.INCREMENTAL,
        restGapFights: 2,
        fightIds: [1],
      }),
    ).rejects.toThrow(
      new ValidationError(
        'Incremental distribution cannot target called or in-progress fights',
      ),
    );
  });

  it('should accept INCREMENTAL distribution for WAITING fight without queue item', async () => {
    const existingQueuedFight = makeFight({
      id: 1,
      status: FightStatus.WAITING,
      areaId: 1,
      athleteAId: 1,
      athleteBId: 2,
      orderIndex: 1,
    });
    const newFight = makeFight({
      id: 2,
      status: FightStatus.WAITING,
      areaId: null,
      athleteAId: 3,
      athleteBId: 4,
      orderIndex: 2,
    });
    const { useCase, areaRepository, fightRepository } = makeSut({
      fights: [existingQueuedFight, newFight],
      queueItems: [
        AreaQueueItem.restore({
          id: 100,
          areaId: 1,
          fightId: 1,
          position: 1,
          status: AreaQueueItemStatus.QUEUED,
        }),
      ],
      athletes: [
        makeAthlete({ id: 1, competitionId: 1, fullName: 'A1' }),
        makeAthlete({ id: 2, competitionId: 1, fullName: 'A2' }),
        makeAthlete({ id: 3, competitionId: 1, fullName: 'A3' }),
        makeAthlete({ id: 4, competitionId: 1, fullName: 'A4' }),
      ],
    });

    const result = await useCase.execute({
      competitionId: 1,
      mode: DistributionMode.INCREMENTAL,
      restGapFights: 2,
      fightIds: [2],
    });

    expect(result.totalDistributed).toBe(1);
    expect(
      (await areaRepository.listByAreaId(1)).map((item) => item.fightId),
    ).toEqual([1, 2]);
    expect(
      (await areaRepository.listByAreaId(1)).map((item) => item.position),
    ).toEqual([1, 2]);
    expect((await fightRepository.findById(2))?.areaId).toBe(1);
  });

  it('should keep all fights from the same keyGroupId in the same area during FULL distribution', async () => {
    const groupFightA = makeFight({
      id: 1,
      keyGroupId: 77,
      athleteAId: 1,
      athleteBId: 2,
      orderIndex: 1,
    });
    const groupFightB = makeFight({
      id: 2,
      keyGroupId: 77,
      athleteAId: 3,
      athleteBId: 4,
      orderIndex: 2,
    });
    const otherGroupFight = makeFight({
      id: 3,
      keyGroupId: 88,
      athleteAId: 5,
      athleteBId: 6,
      orderIndex: 1,
    });
    const { useCase, fightRepository } = makeSut({
      fights: [groupFightA, groupFightB, otherGroupFight],
      areas: [makeArea(1, 1, 1), makeArea(2, 1, 2)],
      athletes: [
        makeAthlete({ id: 1, competitionId: 1, fullName: 'A1' }),
        makeAthlete({ id: 2, competitionId: 1, fullName: 'A2' }),
        makeAthlete({ id: 3, competitionId: 1, fullName: 'A3' }),
        makeAthlete({ id: 4, competitionId: 1, fullName: 'A4' }),
        makeAthlete({ id: 5, competitionId: 1, fullName: 'A5' }),
        makeAthlete({ id: 6, competitionId: 1, fullName: 'A6' }),
      ],
    });

    await useCase.execute({
      competitionId: 1,
      mode: DistributionMode.FULL,
      restGapFights: 2,
    });

    const persistedFightA = await fightRepository.findById(1);
    const persistedFightB = await fightRepository.findById(2);

    expect(persistedFightA?.areaId).not.toBeNull();
    expect(persistedFightA?.areaId).toBe(persistedFightB?.areaId);
  });

  it('should append incremental fights after the existing queue tail', async () => {
    const queuedFightA = makeFight({
      id: 1,
      status: FightStatus.WAITING,
      areaId: 1,
      athleteAId: 1,
      athleteBId: 2,
      orderIndex: 1,
    });
    const queuedFightB = makeFight({
      id: 2,
      status: FightStatus.WAITING,
      areaId: 1,
      athleteAId: 3,
      athleteBId: 4,
      orderIndex: 2,
    });
    const newFight = makeFight({
      id: 3,
      status: FightStatus.WAITING,
      areaId: null,
      athleteAId: 5,
      athleteBId: 6,
      orderIndex: 3,
    });
    const { useCase, areaRepository } = makeSut({
      fights: [queuedFightA, queuedFightB, newFight],
      queueItems: [
        AreaQueueItem.restore({
          id: 100,
          areaId: 1,
          fightId: 1,
          position: 1,
          status: AreaQueueItemStatus.QUEUED,
        }),
        AreaQueueItem.restore({
          id: 101,
          areaId: 1,
          fightId: 2,
          position: 2,
          status: AreaQueueItemStatus.QUEUED,
        }),
      ],
      athletes: [
        makeAthlete({ id: 1, competitionId: 1, fullName: 'A1' }),
        makeAthlete({ id: 2, competitionId: 1, fullName: 'A2' }),
        makeAthlete({ id: 3, competitionId: 1, fullName: 'A3' }),
        makeAthlete({ id: 4, competitionId: 1, fullName: 'A4' }),
        makeAthlete({ id: 5, competitionId: 1, fullName: 'A5' }),
        makeAthlete({ id: 6, competitionId: 1, fullName: 'A6' }),
      ],
    });

    await useCase.execute({
      competitionId: 1,
      mode: DistributionMode.INCREMENTAL,
      restGapFights: 2,
      fightIds: [3],
    });

    const queue = await areaRepository.listByAreaId(1);

    expect(queue.map((item) => item.fightId)).toEqual([1, 2, 3]);
    expect(queue.map((item) => item.position)).toEqual([1, 2, 3]);
  });

  it('should assign incremental key-group fights to the least loaded area when multiple areas exist', async () => {
    const existingFightOnArea1 = makeFight({
      id: 1,
      status: FightStatus.WAITING,
      areaId: 1,
      keyGroupId: 10,
      athleteAId: 1,
      athleteBId: 2,
      orderIndex: 1,
    });
    const newGroupFightA = makeFight({
      id: 2,
      status: FightStatus.WAITING,
      areaId: null,
      keyGroupId: 200,
      athleteAId: 3,
      athleteBId: 4,
      orderIndex: 1,
    });
    const newGroupFightB = makeFight({
      id: 3,
      status: FightStatus.WAITING,
      areaId: null,
      keyGroupId: 200,
      athleteAId: 5,
      athleteBId: 6,
      orderIndex: 2,
    });
    const { useCase, areaRepository, fightRepository } = makeSut({
      fights: [existingFightOnArea1, newGroupFightA, newGroupFightB],
      areas: [makeArea(1, 1, 1), makeArea(2, 1, 2)],
      queueItems: [
        AreaQueueItem.restore({
          id: 100,
          areaId: 1,
          fightId: 1,
          position: 1,
          status: AreaQueueItemStatus.QUEUED,
        }),
      ],
      athletes: [
        makeAthlete({ id: 1, competitionId: 1, fullName: 'A1' }),
        makeAthlete({ id: 2, competitionId: 1, fullName: 'A2' }),
        makeAthlete({ id: 3, competitionId: 1, fullName: 'A3' }),
        makeAthlete({ id: 4, competitionId: 1, fullName: 'A4' }),
        makeAthlete({ id: 5, competitionId: 1, fullName: 'A5' }),
        makeAthlete({ id: 6, competitionId: 1, fullName: 'A6' }),
      ],
    });

    await useCase.execute({
      competitionId: 1,
      mode: DistributionMode.INCREMENTAL,
      restGapFights: 2,
      fightIds: [2, 3],
    });

    expect((await fightRepository.findById(2))?.areaId).toBe(2);
    expect((await fightRepository.findById(3))?.areaId).toBe(2);
    expect(
      (await areaRepository.listByAreaId(2)).map((item) => item.fightId),
    ).toEqual([2, 3]);
  });

  it('should rebuild the full queue when FULL distribution runs without locked fights', async () => {
    const firstFight = makeFight({
      id: 1,
      status: FightStatus.WAITING,
      areaId: 2,
      athleteAId: 1,
      athleteBId: 2,
      orderIndex: 1,
    });
    const secondFight = makeFight({
      id: 2,
      status: FightStatus.WAITING,
      areaId: null,
      athleteAId: 3,
      athleteBId: 4,
      orderIndex: 2,
    });
    const { useCase, areaRepository } = makeSut({
      fights: [firstFight, secondFight],
      areas: [makeArea(1, 1, 1), makeArea(2, 1, 2)],
      queueItems: [
        AreaQueueItem.restore({
          id: 900,
          areaId: 1,
          fightId: 999,
          position: 1,
          status: AreaQueueItemStatus.QUEUED,
        }),
      ],
      athletes: [
        makeAthlete({ id: 1, competitionId: 1, fullName: 'A1' }),
        makeAthlete({ id: 2, competitionId: 1, fullName: 'A2' }),
        makeAthlete({ id: 3, competitionId: 1, fullName: 'A3' }),
        makeAthlete({ id: 4, competitionId: 1, fullName: 'A4' }),
      ],
    });

    const result = await useCase.execute({
      competitionId: 1,
      mode: DistributionMode.FULL,
      restGapFights: 2,
    });

    const queueArea1 = await areaRepository.listByAreaId(1);
    const queueArea2 = await areaRepository.listByAreaId(2);

    expect(result.totalDistributed).toBe(2);
    expect(
      [...queueArea1, ...queueArea2]
        .map((item) => item.fightId)
        .sort((a, b) => a - b),
    ).toEqual([1, 2]);
    expect(
      [...queueArea1, ...queueArea2].some((item) => item.fightId === 999),
    ).toBe(false);
  });

  it('should keep all fights from the same category in the same area in ABSOLUTE_GP mode', async () => {
    const categoryOneFightA = makeFight({
      id: 1,
      categoryId: 100,
      keyGroupId: null,
      athleteAId: 1,
      athleteBId: 2,
      orderIndex: 1,
    });
    const categoryOneFightB = makeFight({
      id: 2,
      categoryId: 100,
      keyGroupId: null,
      athleteAId: 3,
      athleteBId: 4,
      orderIndex: 2,
    });
    const categoryOneFightC = makeFight({
      id: 3,
      categoryId: 100,
      keyGroupId: null,
      athleteAId: 5,
      athleteBId: 6,
      orderIndex: 3,
    });
    const categoryTwoFight = makeFight({
      id: 4,
      categoryId: 200,
      keyGroupId: null,
      athleteAId: 7,
      athleteBId: 8,
      orderIndex: 1,
    });
    const { useCase, fightRepository } = makeSut({
      competition: makeCompetition({
        id: 1,
        mode: CompetitionMode.ABSOLUTE_GP,
      }),
      fights: [
        categoryOneFightA,
        categoryOneFightB,
        categoryOneFightC,
        categoryTwoFight,
      ],
      areas: [makeArea(1, 1, 1), makeArea(2, 1, 2)],
      athletes: [
        makeAthlete({ id: 1, competitionId: 1, fullName: 'A1' }),
        makeAthlete({ id: 2, competitionId: 1, fullName: 'A2' }),
        makeAthlete({ id: 3, competitionId: 1, fullName: 'A3' }),
        makeAthlete({ id: 4, competitionId: 1, fullName: 'A4' }),
        makeAthlete({ id: 5, competitionId: 1, fullName: 'A5' }),
        makeAthlete({ id: 6, competitionId: 1, fullName: 'A6' }),
        makeAthlete({ id: 7, competitionId: 1, fullName: 'A7' }),
        makeAthlete({ id: 8, competitionId: 1, fullName: 'A8' }),
      ],
    });

    await useCase.execute({
      competitionId: 1,
      mode: DistributionMode.FULL,
      restGapFights: 2,
    });

    const firstArea = (await fightRepository.findById(1))?.areaId;
    const secondArea = (await fightRepository.findById(2))?.areaId;
    const thirdArea = (await fightRepository.findById(3))?.areaId;
    const otherCategoryArea = (await fightRepository.findById(4))?.areaId;

    expect(firstArea).not.toBeNull();
    expect(firstArea).toBe(secondArea);
    expect(firstArea).toBe(thirdArea);
    expect(otherCategoryArea).not.toBeNull();
  });

  it('should balance ABSOLUTE_GP categories by total fight count without splitting categories', async () => {
    const fights = [
      makeFight({
        id: 1,
        categoryId: 100,
        keyGroupId: null,
        athleteAId: 1,
        athleteBId: 2,
        orderIndex: 1,
      }),
      makeFight({
        id: 2,
        categoryId: 100,
        keyGroupId: null,
        athleteAId: 3,
        athleteBId: 4,
        orderIndex: 2,
      }),
      makeFight({
        id: 3,
        categoryId: 100,
        keyGroupId: null,
        athleteAId: 5,
        athleteBId: 6,
        orderIndex: 3,
      }),
      makeFight({
        id: 4,
        categoryId: 200,
        keyGroupId: null,
        athleteAId: 7,
        athleteBId: 8,
        orderIndex: 1,
      }),
      makeFight({
        id: 5,
        categoryId: 200,
        keyGroupId: null,
        athleteAId: 9,
        athleteBId: 10,
        orderIndex: 2,
      }),
      makeFight({
        id: 6,
        categoryId: 300,
        keyGroupId: null,
        athleteAId: 11,
        athleteBId: 12,
        orderIndex: 1,
      }),
    ];
    const { useCase, areaRepository } = makeSut({
      competition: makeCompetition({
        id: 1,
        mode: CompetitionMode.ABSOLUTE_GP,
      }),
      fights,
      areas: [makeArea(1, 1, 1), makeArea(2, 1, 2)],
      athletes: Array.from({ length: 12 }, (_, index) =>
        makeAthlete({
          id: index + 1,
          competitionId: 1,
          fullName: `A${index + 1}`,
        }),
      ),
    });

    await useCase.execute({
      competitionId: 1,
      mode: DistributionMode.FULL,
      restGapFights: 2,
    });

    const queueArea1 = await areaRepository.listByAreaId(1);
    const queueArea2 = await areaRepository.listByAreaId(2);

    expect(queueArea1).toHaveLength(3);
    expect(queueArea2).toHaveLength(3);
    expect(queueArea1.map((item) => item.fightId)).toEqual([1, 2, 3]);
    expect(queueArea2.map((item) => item.fightId)).toEqual([4, 5, 6]);
  });

  it('should rebalance FULL distribution even when all waiting fights were previously assigned to the same area', async () => {
    const firstGroupFight = makeFight({
      id: 1,
      status: FightStatus.WAITING,
      areaId: 1,
      keyGroupId: 10,
      athleteAId: 1,
      athleteBId: 2,
      orderIndex: 1,
    });
    const secondGroupFight = makeFight({
      id: 2,
      status: FightStatus.WAITING,
      areaId: 1,
      keyGroupId: 20,
      athleteAId: 3,
      athleteBId: 4,
      orderIndex: 1,
    });
    const { useCase, fightRepository } = makeSut({
      fights: [firstGroupFight, secondGroupFight],
      areas: [makeArea(1, 1, 1), makeArea(2, 1, 2)],
      athletes: [
        makeAthlete({ id: 1, competitionId: 1, fullName: 'A1' }),
        makeAthlete({ id: 2, competitionId: 1, fullName: 'A2' }),
        makeAthlete({ id: 3, competitionId: 1, fullName: 'A3' }),
        makeAthlete({ id: 4, competitionId: 1, fullName: 'A4' }),
      ],
    });

    await useCase.execute({
      competitionId: 1,
      mode: DistributionMode.FULL,
      restGapFights: 2,
    });

    const fight1 = await fightRepository.findById(1);
    const fight2 = await fightRepository.findById(2);

    expect(fight1?.areaId).not.toBeNull();
    expect(fight2?.areaId).not.toBeNull();
    expect(new Set([fight1?.areaId, fight2?.areaId]).size).toBe(2);
  });
});
