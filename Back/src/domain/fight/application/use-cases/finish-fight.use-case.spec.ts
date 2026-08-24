import { beforeEach, describe, expect, it } from 'vitest';
import { DomainEvent, DomainEventHandler, EventBus } from '@/core/events/event-bus.interface';
import { AreaQueueItem } from '@/domain/area/domain/entities/area-queue-item.entity';
import { AreaQueueItemStatus } from '@/domain/area/domain/value-objects/area-queue-item-status.enum';
import { AreaQueueFightDetails } from '@/domain/area/repository/area-queue-fight-details.type';
import { IAreaQueueItemRepository } from '@/domain/area/repository/IAreaQueueItemRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { InMemoryFightRepository } from '../../../../../test/repositories/in-memory';
import { FightEntity } from '../../domain/entities/fight.entity';
import { FightStatus } from '../../domain/value-objects/fight-status.enum';
import { FinishFightUseCase } from './finish-fight.use-case';

class InMemoryAreaQueueItemRepository implements IAreaQueueItemRepository {
  constructor(private items: AreaQueueItem[] = []) {}

  async createManyQueueItems(items: AreaQueueItem[]): Promise<AreaQueueItem[]> {
    this.items = [...this.items, ...items];
    return items;
  }

  async replaceForCompetition(): Promise<AreaQueueItem[]> {
    return [];
  }

  async listByAreaId(areaId: number): Promise<AreaQueueItem[]> {
    return this.items.filter((item) => item.areaId === areaId);
  }

  async listByAreaIds(areaIds: number[]): Promise<AreaQueueItem[]> {
    return this.items.filter((item) => areaIds.includes(item.areaId));
  }

  async replaceForAreas(): Promise<AreaQueueItem[]> {
    return [];
  }

  async listFightDetailsByAreaId(): Promise<AreaQueueFightDetails[]> {
    return [];
  }

  async findByFightId(fightId: number): Promise<AreaQueueItem | null> {
    return this.items.find((item) => item.fightId === fightId) ?? null;
  }

  async update(item: AreaQueueItem): Promise<AreaQueueItem> {
    this.items = this.items.map((current) =>
      current.id === item.id ? item : current,
    );
    return item;
  }
}

class RecordingEventBus implements EventBus {
  public published: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.published.push(event);
  }

  subscribe(_eventName: string, _handler: DomainEventHandler): () => void {
    return () => {};
  }
}

function makeFight(overrides: Partial<Parameters<typeof FightEntity.restore>[0]> = {}) {
  return FightEntity.restore({
    id: 1,
    competitionId: 1,
    categoryId: 1,
    keyGroupId: null,
    round: 1,
    order: 1,
    areaId: null,
    areaName: null,
    status: FightStatus.IN_PROGRESS,
    athleteAId: 10,
    athleteBId: 20,
    winType: null,
    startedAt: new Date('2026-01-10T10:00:00.000Z'),
    finishedAt: null,
    ...overrides,
  });
}

describe('FinishFightUseCase', () => {
  let fightRepository: InMemoryFightRepository;
  let areaQueueItemRepository: InMemoryAreaQueueItemRepository;
  let eventBus: RecordingEventBus;

  beforeEach(() => {
    eventBus = new RecordingEventBus();
  });

  it('finishes an in-progress fight recording winner and loser', async () => {
    fightRepository = new InMemoryFightRepository([makeFight()]);
    areaQueueItemRepository = new InMemoryAreaQueueItemRepository();
    const useCase = new FinishFightUseCase(fightRepository, areaQueueItemRepository, eventBus);

    const result = await useCase.execute({ id: 1, winnerAthleteId: 10, winType: 'POINTS' });

    expect(result.status).toBe(FightStatus.FINISHED);
    expect(result.winnerId).toBe(10);
    expect(result.loserId).toBe(20);
    expect(eventBus.published).toContainEqual(
      expect.objectContaining({
        name: 'fight.finished',
        payload: expect.objectContaining({ fightId: 1, winnerAthleteId: 10 }),
      }),
    );
  });

  it('marks the queue item as done and publishes queue.updated when one exists', async () => {
    fightRepository = new InMemoryFightRepository([makeFight()]);
    areaQueueItemRepository = new InMemoryAreaQueueItemRepository([
      AreaQueueItem.restore({
        id: 5,
        areaId: 2,
        fightId: 1,
        position: 1,
        status: AreaQueueItemStatus.CALLED,
      }),
    ]);
    const useCase = new FinishFightUseCase(fightRepository, areaQueueItemRepository, eventBus);

    await useCase.execute({ id: 1, winnerAthleteId: 20, winType: 'SUBMISSION' });

    const updatedQueueItem = await areaQueueItemRepository.findByFightId(1);
    expect(updatedQueueItem?.status).toBe(AreaQueueItemStatus.DONE);
    expect(eventBus.published.map((event) => event.name)).toEqual(
      expect.arrayContaining(['queue.updated', 'nextfight.updated', 'fight.finished']),
    );
  });

  it('throws NotFoundError when the fight does not exist', async () => {
    fightRepository = new InMemoryFightRepository([]);
    areaQueueItemRepository = new InMemoryAreaQueueItemRepository();
    const useCase = new FinishFightUseCase(fightRepository, areaQueueItemRepository, eventBus);

    await expect(
      useCase.execute({ id: 999, winnerAthleteId: 10, winType: 'POINTS' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects finishing a fight that is not in progress', async () => {
    fightRepository = new InMemoryFightRepository([
      makeFight({ status: FightStatus.PENDING }),
    ]);
    areaQueueItemRepository = new InMemoryAreaQueueItemRepository();
    const useCase = new FinishFightUseCase(fightRepository, areaQueueItemRepository, eventBus);

    await expect(
      useCase.execute({ id: 1, winnerAthleteId: 10, winType: 'POINTS' }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
