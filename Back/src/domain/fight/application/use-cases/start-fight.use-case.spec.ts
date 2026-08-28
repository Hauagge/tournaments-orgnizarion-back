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
    fightRepository = new InMemoryFightRepository([makeFight({ areaId: 5 })]);
    useCase = new StartFightUseCase(fightRepository, eventBus);

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
    useCase = new StartFightUseCase(fightRepository, eventBus);

    await expect(useCase.execute(1)).rejects.toBeInstanceOf(ValidationError);
    expect(eventBus.published).toEqual([]);
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
      makeFight({ areaId: 5, athleteBId: null }),
    ]);
    useCase = new StartFightUseCase(fightRepository, eventBus);

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
    useCase = new StartFightUseCase(fightRepository, eventBus);

    await expect(useCase.execute(1)).rejects.toBeInstanceOf(ValidationError);
    expect(eventBus.published).toEqual([]);
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
    useCase = new StartFightUseCase(fightRepository, eventBus);

    const result = await useCase.execute(1);

    expect(result.status).toBe(FightStatus.IN_PROGRESS);
  });
});
