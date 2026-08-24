import { beforeEach, describe, expect, it } from 'vitest';
import { DomainEvent, DomainEventHandler, EventBus } from '@/core/events/event-bus.interface';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { InMemoryFightRepository } from '../../../../../test/repositories/in-memory';
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

describe('StartFightUseCase', () => {
  let fightRepository: InMemoryFightRepository;
  let eventBus: RecordingEventBus;
  let useCase: StartFightUseCase;

  beforeEach(() => {
    eventBus = new RecordingEventBus();
  });

  it('starts a pending fight with both athletes and publishes fight.started', async () => {
    fightRepository = new InMemoryFightRepository([makeFight()]);
    useCase = new StartFightUseCase(fightRepository, eventBus);

    const result = await useCase.execute(1);

    expect(result.status).toBe(FightStatus.IN_PROGRESS);
    expect(eventBus.published).toEqual([
      expect.objectContaining({
        name: 'fight.started',
        payload: { fightId: 1, competitionId: 1 },
      }),
    ]);
  });

  it('throws NotFoundError when the fight does not exist', async () => {
    fightRepository = new InMemoryFightRepository([]);
    useCase = new StartFightUseCase(fightRepository, eventBus);

    await expect(useCase.execute(999)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects starting a fight that is already finished', async () => {
    fightRepository = new InMemoryFightRepository([
      makeFight({ status: FightStatus.FINISHED }),
    ]);
    useCase = new StartFightUseCase(fightRepository, eventBus);

    await expect(useCase.execute(1)).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects starting a fight missing an athlete even if status allows it', async () => {
    fightRepository = new InMemoryFightRepository([
      makeFight({ athleteBId: null }),
    ]);
    useCase = new StartFightUseCase(fightRepository, eventBus);

    await expect(useCase.execute(1)).rejects.toBeInstanceOf(ValidationError);
  });
});
