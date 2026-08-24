import { EventBus } from '@/core/events/event-bus.interface';
import { Area } from '@/domain/area/domain/entities/area.entity';
import { AreaQueueItem } from '@/domain/area/domain/entities/area-queue-item.entity';
import { AreaQueueItemStatus } from '@/domain/area/domain/value-objects/area-queue-item-status.enum';
import { AreaQueueFightDetails } from '@/domain/area/repository/area-queue-fight-details.type';
import { IAreaQueueItemRepository } from '@/domain/area/repository/IAreaQueueItemRepository.repository';
import { IAreaRepository } from '@/domain/area/repository/IAreaRepository.repository';
import { FightEntity } from '@/domain/fight/domain/entities/fight.entity';
import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';
import { makeCompetition } from '../../../../../test/factories';
import {
  InMemoryCompetitionRepository,
  InMemoryFightRepository,
} from '../../../../../test/repositories/in-memory';
import { ValidationError } from '@/shared/errors/validation.error';
import { GetAreaQueueUseCase } from './get-area-queue.use-case';
import { MoveKeyGroupAreaDistributionUseCase } from './move-key-group-area-distribution.use-case';

class InMemoryAreaRepository
  implements IAreaRepository, IAreaQueueItemRepository
{
  constructor(
    private areas: Area[] = [],
    private queueItems: AreaQueueItem[] = [],
    private readonly fights: FightEntity[] = [],
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
      .sort((left, right) => left.areaId - right.areaId || left.position - right.position);
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
    areaId: number,
  ): Promise<AreaQueueFightDetails[]> {
    const fightsById = new Map(
      this.fights.map((fight) => [fight.id as number, fight]),
    );

    return (await this.listByAreaId(areaId)).map((item) => {
      const fight = fightsById.get(item.fightId);

      return {
        queueItemId: item.id as number,
        fightId: item.fightId,
        position: item.position,
        queueStatus: item.status,
        fightStatus: fight?.status ?? FightStatus.WAITING,
        athleteAId: fight?.athleteAId ?? 0,
        athleteAName: null,
        athleteBId: fight?.athleteBId ?? 0,
        athleteBName: null,
        keyGroupId: fight?.keyGroupId ?? null,
        orderIndex: fight?.orderIndex ?? item.position,
      };
    });
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

class RecordingEventBus implements EventBus {
  readonly events: Array<{ name: string; payload: Record<string, unknown> }> = [];

  async publish(event: {
    name: string;
    payload: Record<string, unknown>;
    occurredAt: Date;
  }): Promise<void> {
    this.events.push({ name: event.name, payload: event.payload });
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
  keyGroupId?: number | null;
  areaId?: number | null;
  status?: FightStatus;
  orderIndex?: number;
}) {
  return FightEntity.restore({
    id: input.id,
    competitionId: 1,
    categoryId: 1,
    keyGroupId: input.keyGroupId ?? 10,
    areaId: input.areaId ?? null,
    areaName: input.areaId ? `Area ${input.areaId}` : null,
    status: input.status ?? FightStatus.WAITING,
    athleteAId: input.id * 2,
    athleteBId: input.id * 2 + 1,
    winnerAthleteId: null,
    loserId: null,
    winType: null,
    startedAt: null,
    finishedAt: null,
    orderIndex: input.orderIndex ?? input.id,
  });
}

function makeQueueItem(input: {
  id: number;
  areaId: number;
  fightId: number;
  position: number;
}) {
  return AreaQueueItem.restore({
    ...input,
    status: AreaQueueItemStatus.QUEUED,
  });
}

describe('MoveKeyGroupAreaDistributionUseCase', () => {
  function makeSut(input: {
    fights: FightEntity[];
    queueItems: AreaQueueItem[];
    areas?: Area[];
  }) {
    const competitionRepository = new InMemoryCompetitionRepository([
      makeCompetition({ id: 1 }),
    ]);
    const fightRepository = new InMemoryFightRepository(input.fights);
    const areaRepository = new InMemoryAreaRepository(
      input.areas ?? [makeArea(1, 1, 1), makeArea(2, 1, 2)],
      input.queueItems,
      input.fights,
    );
    const getAreaQueueUseCase = new GetAreaQueueUseCase(
      areaRepository,
      areaRepository,
    );
    const eventBus = new RecordingEventBus();
    const useCase = new MoveKeyGroupAreaDistributionUseCase(
      competitionRepository,
      areaRepository,
      areaRepository,
      fightRepository,
      getAreaQueueUseCase,
      eventBus,
    );

    return { useCase, areaRepository, fightRepository, eventBus };
  }

  it('moves every queued fight from the key group to the destination area at the requested position', async () => {
    const groupFightA = makeFight({
      id: 1,
      keyGroupId: 10,
      areaId: 1,
      orderIndex: 1,
    });
    const groupFightB = makeFight({
      id: 2,
      keyGroupId: 10,
      areaId: 1,
      orderIndex: 2,
    });
    const sourceOtherFight = makeFight({
      id: 3,
      keyGroupId: 20,
      areaId: 1,
      orderIndex: 1,
    });
    const destinationExistingFight = makeFight({
      id: 4,
      keyGroupId: 30,
      areaId: 2,
      orderIndex: 1,
    });

    const { useCase, areaRepository, fightRepository, eventBus } = makeSut({
      fights: [
        groupFightA,
        groupFightB,
        sourceOtherFight,
        destinationExistingFight,
      ],
      queueItems: [
        makeQueueItem({ id: 101, areaId: 1, fightId: 1, position: 1 }),
        makeQueueItem({ id: 102, areaId: 1, fightId: 2, position: 2 }),
        makeQueueItem({ id: 103, areaId: 1, fightId: 3, position: 3 }),
        makeQueueItem({ id: 104, areaId: 2, fightId: 4, position: 1 }),
      ],
    });

    const result = await useCase.execute({
      competitionId: 1,
      keyGroupId: 10,
      fromAreaId: 1,
      toAreaId: 2,
      orderIndex: 1,
    });

    expect((await areaRepository.listByAreaId(1)).map((item) => item.fightId)).toEqual([
      3,
    ]);
    expect((await areaRepository.listByAreaId(1)).map((item) => item.position)).toEqual([
      1,
    ]);
    expect((await areaRepository.listByAreaId(2)).map((item) => item.fightId)).toEqual([
      4,
      1,
      2,
    ]);
    expect((await areaRepository.listByAreaId(2)).map((item) => item.position)).toEqual([
      1,
      2,
      3,
    ]);
    expect((await fightRepository.findById(1))?.areaId).toBe(2);
    expect((await fightRepository.findById(2))?.areaId).toBe(2);
    expect(result.areas.map((area) => area.area.id)).toEqual([1, 2]);
    expect(eventBus.events).toEqual([
      {
        name: 'queue.updated',
        payload: {
          competitionId: 1,
          areaIds: [1, 2],
          keyGroupId: 10,
        },
      },
    ]);
  });

  it('rejects moving a key group that is not fully queued in the source area', async () => {
    const { useCase } = makeSut({
      fights: [
        makeFight({ id: 1, keyGroupId: 10, areaId: 1 }),
        makeFight({ id: 2, keyGroupId: 10, areaId: 2 }),
      ],
      queueItems: [
        makeQueueItem({ id: 101, areaId: 1, fightId: 1, position: 1 }),
        makeQueueItem({ id: 102, areaId: 2, fightId: 2, position: 1 }),
      ],
    });

    await expect(
      useCase.execute({
        competitionId: 1,
        keyGroupId: 10,
        fromAreaId: 1,
        toAreaId: 2,
        orderIndex: 0,
      }),
    ).rejects.toThrow(
      new ValidationError('Key group is not fully allocated in the source area'),
    );
  });

  it('rejects moving a key group with called or in-progress fights', async () => {
    const { useCase } = makeSut({
      fights: [
        makeFight({
          id: 1,
          keyGroupId: 10,
          areaId: 1,
          status: FightStatus.CALLED,
        }),
      ],
      queueItems: [makeQueueItem({ id: 101, areaId: 1, fightId: 1, position: 1 })],
    });

    await expect(
      useCase.execute({
        competitionId: 1,
        keyGroupId: 10,
        fromAreaId: 1,
        toAreaId: 2,
        orderIndex: 0,
      }),
    ).rejects.toThrow(
      new ValidationError('Key group cannot be moved while fights are active'),
    );
  });
});
