import { beforeEach, describe, expect, it } from 'vitest';
import { DomainEvent, EventBus } from '@/core/events/event-bus.interface';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { AreaQueueItem } from '@/domain/area/domain/entities/area-queue-item.entity';
import { AreaQueueItemStatus } from '@/domain/area/domain/value-objects/area-queue-item-status.enum';
import {
  InMemoryAreaQueueItemRepository,
  InMemoryAreaQueueTransaction,
  InMemoryFightRepository,
} from '../../../../../test/repositories/in-memory';
import { FightEntity } from '../../domain/entities/fight.entity';
import { FightStatus } from '../../domain/value-objects/fight-status.enum';
import { SetFightCalledUseCase } from './set-fight-called.use-case';

class RecordingEventBus implements EventBus {
  public published: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.published.push(event);
  }

  subscribe(): () => void {
    return () => {};
  }
}

function makeFight(
  overrides: Partial<Parameters<typeof FightEntity.restore>[0]> = {},
) {
  return FightEntity.restore({
    id: 1,
    competitionId: 1,
    categoryId: 1,
    keyGroupId: null,
    round: 1,
    order: 1,
    areaId: 5,
    areaName: 'Area 1',
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

describe('SetFightCalledUseCase', () => {
  let fightRepository: InMemoryFightRepository;
  let queueRepository: InMemoryAreaQueueItemRepository;
  let eventBus: RecordingEventBus;

  function makeUseCase(fights: FightEntity[], queueItems: AreaQueueItem[]) {
    fightRepository = new InMemoryFightRepository(fights);
    queueRepository = new InMemoryAreaQueueItemRepository(queueItems);

    return new SetFightCalledUseCase(
      fightRepository,
      new InMemoryAreaQueueTransaction(queueRepository, fightRepository),
      eventBus,
    );
  }

  beforeEach(() => {
    eventBus = new RecordingEventBus();
  });

  it('marca como chamada a luta agendada e o item dela na fila', async () => {
    const useCase = makeUseCase([makeFight()], [makeQueueItem()]);

    const result = await useCase.execute({ fightId: 1, called: true });

    expect(result.status).toBe(FightStatus.CALLED);
    expect(queueRepository.items[0].status).toBe(AreaQueueItemStatus.CALLED);
    expect(eventBus.published).toEqual([
      expect.objectContaining({
        name: 'queue.updated',
        payload: expect.objectContaining({
          competitionId: 1,
          areaId: 5,
          fightId: 1,
          status: AreaQueueItemStatus.CALLED,
        }),
      }),
    ]);
  });

  it('permite mais de uma luta chamada na mesma area', async () => {
    const useCase = makeUseCase(
      [
        makeFight({ id: 1, status: FightStatus.CALLED }),
        makeFight({ id: 2, order: 2 }),
      ],
      [
        makeQueueItem({ id: 1, status: AreaQueueItemStatus.CALLED }),
        makeQueueItem({ id: 2, fightId: 2, position: 2 }),
      ],
    );

    const result = await useCase.execute({ fightId: 2, called: true });

    expect(result.status).toBe(FightStatus.CALLED);
  });

  it('volta a luta chamada para agendada, junto com o item da fila', async () => {
    const useCase = makeUseCase(
      [makeFight({ status: FightStatus.CALLED })],
      [makeQueueItem({ status: AreaQueueItemStatus.CALLED })],
    );

    const result = await useCase.execute({ fightId: 1, called: false });

    expect(result.status).toBe(FightStatus.PENDING);
    expect(queueRepository.items[0].status).toBe(AreaQueueItemStatus.QUEUED);
    expect(eventBus.published[0].payload).toEqual(
      expect.objectContaining({ status: AreaQueueItemStatus.QUEUED }),
    );
  });

  it('recusa chamar luta que ainda nao tem os dois atletas', async () => {
    const useCase = makeUseCase(
      [makeFight({ athleteBId: null })],
      [makeQueueItem()],
    );

    await expect(
      useCase.execute({ fightId: 1, called: true }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(queueRepository.items[0].status).toBe(AreaQueueItemStatus.QUEUED);
  });

  it('recusa chamar luta que nao esta na fila de nenhuma area', async () => {
    const useCase = makeUseCase([makeFight()], []);

    await expect(
      useCase.execute({ fightId: 1, called: true }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect((await fightRepository.findById(1))?.status).toBe(
      FightStatus.PENDING,
    );
  });

  it.each([FightStatus.IN_PROGRESS, FightStatus.FINISHED])(
    'recusa voltar para agendada uma luta %s',
    async (status) => {
      const useCase = makeUseCase(
        [makeFight({ status })],
        [makeQueueItem({ status: AreaQueueItemStatus.CALLED })],
      );

      await expect(
        useCase.execute({ fightId: 1, called: false }),
      ).rejects.toBeInstanceOf(ValidationError);
      expect((await fightRepository.findById(1))?.status).toBe(status);
    },
  );

  it('falha com NotFoundError quando a luta nao existe', async () => {
    const useCase = makeUseCase([], []);

    await expect(
      useCase.execute({ fightId: 99, called: true }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
