import { beforeEach, describe, expect, it } from 'vitest';
import { DomainEvent, DomainEventHandler, EventBus } from '@/core/events/event-bus.interface';
import { AreaQueueItemStatus } from '@/domain/area/domain/value-objects/area-queue-item-status.enum';
import { AreaQueueItemTypeOrmEntity } from '@/domain/area/infra/persistence/entities/area-queue-item.typeorm-entity';
import { CategoryTypeOrmEntity } from '@/domain/category/infra/persistence/entities/category.typeorm-entity';
import { ICategoryRepository } from '@/domain/category/repository/ICategoryRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { FightStatus } from '../../domain/value-objects/fight-status.enum';
import { FightTypeOrmEntity } from '../../entities/fight.typeorm-entity';
import { makeFakeDataSource } from '../../../../../test/fakes/typeorm-fake-data-source';
import { BestOfThreeProgressionService } from '../services/best-of-three-progression.service';
import { MarkFightWinnerUseCase } from './mark-fight-winner.use-case';

class RecordingEventBus implements EventBus {
  public published: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.published.push(event);
  }

  subscribe(_eventName: string, _handler: DomainEventHandler): () => void {
    return () => {};
  }
}

function makeFightRow(overrides: Partial<FightTypeOrmEntity> = {}): FightTypeOrmEntity {
  return {
    id: 1,
    competitionId: 1,
    categoryId: 1,
    keyGroupId: null,
    round: 1,
    order: 1,
    areaId: null,
    status: FightStatus.IN_PROGRESS,
    athleteAId: 10,
    athleteBId: 20,
    winnerId: null,
    loserId: null,
    nextFightId: null,
    nextFightSlot: null,
    createdManually: false,
    isWo: false,
    winType: null,
    startedAt: new Date('2026-01-10T10:00:00.000Z'),
    finishedAt: null,
    area: null,
    createdAt: new Date('2026-01-10T09:00:00.000Z'),
    updatedAt: new Date('2026-01-10T09:00:00.000Z'),
    ...overrides,
  };
}

describe('MarkFightWinnerUseCase', () => {
  let eventBus: RecordingEventBus;
  let bestOfThreeProgressionService: BestOfThreeProgressionService;

  beforeEach(() => {
    eventBus = new RecordingEventBus();
    bestOfThreeProgressionService = new BestOfThreeProgressionService();
  });

  function setup(fights: FightTypeOrmEntity[], categories: CategoryTypeOrmEntity[] = []) {
    const { manager, dataSource } = makeFakeDataSource({ fights, categories });
    const useCase = new MarkFightWinnerUseCase(
      dataSource as never,
      {} as ICategoryRepository,
      eventBus,
      bestOfThreeProgressionService,
    );
    return { useCase, manager };
  }

  it('marks the winner and sets the category champion when there is no next fight', async () => {
    const { useCase } = setup(
      [makeFightRow()],
      [
        {
          id: 1,
          competitionId: 1,
          name: 'Adulto Branco Leve',
          belt: 'white',
          allowMerge: false,
          mergeWithBelt: null,
          ageMin: null,
          ageMax: null,
          weightMinGrams: null,
          weightMaxGrams: null,
          totalAthletes: 2,
          championAthleteId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    );

    const result = await useCase.execute({
      currentUserId: 1,
      competitionId: 1,
      fightId: 1,
      winnerId: 10,
    });

    expect(result.fight.status).toBe(FightStatus.FINISHED);
    expect(result.fight.winnerId).toBe(10);
    expect(result.fight.loserId).toBe(20);
    expect(result.categoryChampion).toEqual({ categoryId: 1, athleteId: 10 });
    expect(eventBus.published).toContainEqual(
      expect.objectContaining({ name: 'fight.finished' }),
    );
  });

  it('propagates the winner into the next fight slot', async () => {
    const { useCase, manager } = setup([
      makeFightRow({ id: 1, nextFightId: 2, nextFightSlot: 'A' }),
      makeFightRow({
        id: 2,
        athleteAId: null,
        athleteBId: 30,
        status: FightStatus.PENDING,
        startedAt: null,
      }),
    ]);

    const result = await useCase.execute({
      currentUserId: 1,
      competitionId: 1,
      fightId: 1,
      winnerId: 10,
    });

    expect(result.nextFight).toEqual(
      expect.objectContaining({ id: 2, athleteAId: 10, athleteBId: 30 }),
    );
    const nextFightRow = await manager.fights.findOneBy({ id: 2 });
    expect(nextFightRow?.athleteAId).toBe(10);
  });

  it('moves the next fight to the area where the fight happened', async () => {
    const { manager, dataSource } = makeFakeDataSource({
      fights: [
        makeFightRow({ id: 1, areaId: 2, nextFightId: 2, nextFightSlot: 'A' }),
        makeFightRow({
          id: 2,
          areaId: 9,
          athleteAId: null,
          athleteBId: 30,
          status: FightStatus.PENDING,
          startedAt: null,
        }),
      ],
      areaQueueItems: [
        {
          id: 5,
          areaId: 2,
          fightId: 1,
          position: 4,
          status: AreaQueueItemStatus.CALLED,
        },
        {
          id: 6,
          areaId: 9,
          fightId: 2,
          position: 1,
          status: AreaQueueItemStatus.QUEUED,
        },
      ],
    });
    const useCase = new MarkFightWinnerUseCase(
      dataSource as never,
      {} as ICategoryRepository,
      eventBus,
      bestOfThreeProgressionService,
    );

    await useCase.execute({ competitionId: 1, fightId: 1, winnerId: 10 });

    const nextFightRow = await manager.fights.findOneBy({ id: 2 });
    expect(nextFightRow?.areaId).toBe(2);
    const nextQueueItem = await manager.areaQueueItems.findOneBy({ id: 6 });
    expect(nextQueueItem?.areaId).toBe(2);
    expect(nextQueueItem?.position).toBe(5);
    expect(nextQueueItem?.status).toBe(AreaQueueItemStatus.QUEUED);
    // A area de origem perdeu uma luta da fila e precisa ser avisada.
    expect(eventBus.published).toContainEqual(
      expect.objectContaining({
        name: 'queue.updated',
        payload: expect.objectContaining({ areaId: 9, fightId: 2 }),
      }),
    );
  });

  it('keeps the next fight queue position when it is already in the same area', async () => {
    const { manager, dataSource } = makeFakeDataSource({
      fights: [
        makeFightRow({ id: 1, areaId: 2, nextFightId: 2, nextFightSlot: 'A' }),
        makeFightRow({
          id: 2,
          areaId: 2,
          athleteAId: null,
          athleteBId: 30,
          status: FightStatus.PENDING,
          startedAt: null,
        }),
      ],
      areaQueueItems: [
        {
          id: 5,
          areaId: 2,
          fightId: 1,
          position: 1,
          status: AreaQueueItemStatus.CALLED,
        },
        {
          id: 6,
          areaId: 2,
          fightId: 2,
          position: 2,
          status: AreaQueueItemStatus.QUEUED,
        },
      ],
    });
    const useCase = new MarkFightWinnerUseCase(
      dataSource as never,
      {} as ICategoryRepository,
      eventBus,
      bestOfThreeProgressionService,
    );

    await useCase.execute({ competitionId: 1, fightId: 1, winnerId: 10 });

    const nextQueueItem = await manager.areaQueueItems.findOneBy({ id: 6 });
    expect(nextQueueItem?.position).toBe(2);
  });

  it('queues the next fight when it had no queue item yet', async () => {
    const { manager, dataSource } = makeFakeDataSource({
      fights: [
        makeFightRow({ id: 1, areaId: 2, nextFightId: 2, nextFightSlot: 'A' }),
        makeFightRow({
          id: 2,
          areaId: null,
          athleteAId: null,
          athleteBId: 30,
          status: FightStatus.PENDING,
          startedAt: null,
        }),
      ],
      areaQueueItems: [
        {
          id: 5,
          areaId: 2,
          fightId: 1,
          position: 1,
          status: AreaQueueItemStatus.CALLED,
        },
      ],
    });
    const useCase = new MarkFightWinnerUseCase(
      dataSource as never,
      {} as ICategoryRepository,
      eventBus,
      bestOfThreeProgressionService,
    );

    await useCase.execute({ competitionId: 1, fightId: 1, winnerId: 10 });

    const nextFightRow = await manager.fights.findOneBy({ id: 2 });
    expect(nextFightRow?.areaId).toBe(2);
    const nextQueueItem = await manager.areaQueueItems.findOneBy({ fightId: 2 });
    expect(nextQueueItem?.areaId).toBe(2);
    expect(nextQueueItem?.position).toBe(2);
  });

  it('marks the linked queue item as done and publishes queue.updated', async () => {
    const { manager, dataSource } = makeFakeDataSource({
      fights: [makeFightRow()],
      areaQueueItems: [
        {
          id: 5,
          areaId: 2,
          fightId: 1,
          position: 1,
          status: AreaQueueItemStatus.CALLED,
        },
      ],
    });
    const useCase = new MarkFightWinnerUseCase(
      dataSource as never,
      {} as ICategoryRepository,
      eventBus,
      bestOfThreeProgressionService,
    );

    await useCase.execute({
      currentUserId: 1,
      competitionId: 1,
      fightId: 1,
      winnerId: 10,
    });

    const queueItem = await manager.areaQueueItems.findOneBy({ id: 5 });
    expect(queueItem?.status).toBe(AreaQueueItemStatus.DONE);
    expect(eventBus.published).toContainEqual(
      expect.objectContaining({ name: 'queue.updated' }),
    );
  });

  it('throws NotFoundError when the fight does not exist', async () => {
    const { useCase } = setup([]);

    await expect(
      useCase.execute({ currentUserId: 1, competitionId: 1, fightId: 999, winnerId: 10 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects marking a winner on a canceled fight', async () => {
    const { useCase } = setup([makeFightRow({ status: FightStatus.CANCELED })]);

    await expect(
      useCase.execute({ currentUserId: 1, competitionId: 1, fightId: 1, winnerId: 10 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects a winnerId that does not belong to the fight', async () => {
    const { useCase } = setup([makeFightRow()]);

    await expect(
      useCase.execute({ currentUserId: 1, competitionId: 1, fightId: 1, winnerId: 999 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
