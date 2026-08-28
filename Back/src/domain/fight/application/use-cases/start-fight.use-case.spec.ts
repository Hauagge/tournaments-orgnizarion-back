import { beforeEach, describe, expect, it } from 'vitest';
import { DomainEvent, DomainEventHandler, EventBus } from '@/core/events/event-bus.interface';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { AreaQueueItem } from '@/domain/area/domain/entities/area-queue-item.entity';
import { AreaQueueItemStatus } from '@/domain/area/domain/value-objects/area-queue-item-status.enum';
import {
  InMemoryAreaQueueItemRepository,
  InMemoryFightRepository,
} from '../../../../../test/repositories/in-memory';
import { FightEntity } from '../../domain/entities/fight.entity';
import { FightStatus } from '../../domain/value-objects/fight-status.enum';
import { StartFightUseCase } from './start-fight.use-case';

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
    status: FightStatus.PENDING,
    athleteAId: 10,
    athleteBId: 20,
    winType: null,
    startedAt: null,
    finishedAt: null,
    ...overrides,
  });
}

function makeQueueItem(
  overrides: Partial<Parameters<typeof AreaQueueItem.restore>[0]> = {},
) {
  return AreaQueueItem.restore({
    id: 1,
    areaId: 5,
    fightId: 1,
    position: 1,
    status: AreaQueueItemStatus.QUEUED,
    ...overrides,
  });
}

describe('StartFightUseCase', () => {
  let fightRepository: InMemoryFightRepository;
  let queueRepository: InMemoryAreaQueueItemRepository;
  let eventBus: RecordingEventBus;
  let useCase: StartFightUseCase;

  beforeEach(() => {
    eventBus = new RecordingEventBus();
    queueRepository = new InMemoryAreaQueueItemRepository();
  });

  it('starts a pending fight with both athletes and publishes fight.started', async () => {
    fightRepository = new InMemoryFightRepository([makeFight({ areaId: 5 })]);
    useCase = new StartFightUseCase(fightRepository, queueRepository, eventBus);

    const result = await useCase.execute(1);

    expect(result.status).toBe(FightStatus.IN_PROGRESS);
    expect(eventBus.published).toEqual([
      expect.objectContaining({
        name: 'fight.started',
        payload: { fightId: 1, competitionId: 1, areaId: 5 },
      }),
    ]);
  });

  it('rejects starting a fight that has no area assigned', async () => {
    fightRepository = new InMemoryFightRepository([makeFight({ areaId: null })]);
    useCase = new StartFightUseCase(fightRepository, queueRepository, eventBus);

    await expect(useCase.execute(1)).rejects.toBeInstanceOf(ValidationError);
    expect(eventBus.published).toEqual([]);
  });

  it('throws NotFoundError when the fight does not exist', async () => {
    fightRepository = new InMemoryFightRepository([]);
    useCase = new StartFightUseCase(fightRepository, queueRepository, eventBus);

    await expect(useCase.execute(999)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects starting a fight that is already finished', async () => {
    fightRepository = new InMemoryFightRepository([
      makeFight({ status: FightStatus.FINISHED }),
    ]);
    useCase = new StartFightUseCase(fightRepository, queueRepository, eventBus);

    await expect(useCase.execute(1)).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects starting a fight missing an athlete even if status allows it', async () => {
    fightRepository = new InMemoryFightRepository([
      makeFight({ areaId: 5, athleteBId: null }),
    ]);
    useCase = new StartFightUseCase(fightRepository, queueRepository, eventBus);

    await expect(useCase.execute(1)).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects starting a fight when another fight in the same area is in progress', async () => {
    fightRepository = new InMemoryFightRepository([
      makeFight({ id: 1, areaId: 5 }),
      makeFight({
        id: 2,
        areaId: 5,
        athleteAId: 30,
        athleteBId: 40,
        status: FightStatus.IN_PROGRESS,
      }),
    ]);
    useCase = new StartFightUseCase(fightRepository, queueRepository, eventBus);

    await expect(useCase.execute(1)).rejects.toBeInstanceOf(ValidationError);
    expect(eventBus.published).toEqual([]);
  });

  it('marks the queued item as called and publishes queue.updated', async () => {
    fightRepository = new InMemoryFightRepository([makeFight({ areaId: 5 })]);
    queueRepository = new InMemoryAreaQueueItemRepository([makeQueueItem()]);
    useCase = new StartFightUseCase(fightRepository, queueRepository, eventBus);

    await useCase.execute(1);

    const queueItem = await queueRepository.findByFightId(1);
    expect(queueItem?.status).toBe(AreaQueueItemStatus.CALLED);
    expect(eventBus.published.map((event) => event.name)).toEqual([
      'fight.started',
      'queue.updated',
    ]);
    expect(eventBus.published[1].payload).toEqual({
      competitionId: 1,
      areaId: 5,
      fightId: 1,
      queueItemId: 1,
      status: AreaQueueItemStatus.CALLED,
    });
  });

  it('keeps an already called queue item untouched', async () => {
    fightRepository = new InMemoryFightRepository([
      makeFight({ areaId: 5, status: FightStatus.CALLED }),
    ]);
    queueRepository = new InMemoryAreaQueueItemRepository([
      makeQueueItem({ status: AreaQueueItemStatus.CALLED }),
    ]);
    useCase = new StartFightUseCase(fightRepository, queueRepository, eventBus);

    await useCase.execute(1);

    const queueItem = await queueRepository.findByFightId(1);
    expect(queueItem?.status).toBe(AreaQueueItemStatus.CALLED);
    expect(eventBus.published.map((event) => event.name)).toEqual([
      'fight.started',
    ]);
  });

  it('starts a fight that has no queue item without failing', async () => {
    fightRepository = new InMemoryFightRepository([makeFight({ areaId: 5 })]);
    useCase = new StartFightUseCase(fightRepository, queueRepository, eventBus);

    const result = await useCase.execute(1);

    expect(result.status).toBe(FightStatus.IN_PROGRESS);
    expect(eventBus.published.map((event) => event.name)).toEqual([
      'fight.started',
    ]);
  });

  it('allows starting a fight when the in-progress fight is in a different area', async () => {
    fightRepository = new InMemoryFightRepository([
      makeFight({ id: 1, areaId: 5 }),
      makeFight({
        id: 2,
        areaId: 6,
        athleteAId: 30,
        athleteBId: 40,
        status: FightStatus.IN_PROGRESS,
      }),
    ]);
    useCase = new StartFightUseCase(fightRepository, queueRepository, eventBus);

    const result = await useCase.execute(1);

    expect(result.status).toBe(FightStatus.IN_PROGRESS);
  });
});
