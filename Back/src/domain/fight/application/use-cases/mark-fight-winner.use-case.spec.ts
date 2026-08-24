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
import { BestOfThreeProgressionService } from '../services/best-of-three-progression.service';
import { MarkFightWinnerUseCase } from './mark-fight-winner.use-case';

class FakeRepository<T extends { id?: number }> {
  private nextId = 1;

  constructor(private rows: T[] = []) {}

  create(data: Partial<T>): T {
    return { ...(data as T) };
  }

  async save(entity: T): Promise<T> {
    if (entity.id === undefined || entity.id === null) {
      entity.id = this.nextId++;
      this.rows.push(entity);
      return entity;
    }

    const index = this.rows.findIndex((row) => row.id === entity.id);
    if (index === -1) {
      this.rows.push(entity);
    } else {
      this.rows[index] = entity;
    }
    return entity;
  }

  async findOneBy(where: Partial<T>): Promise<T | null> {
    return (
      this.rows.find((row) =>
        Object.entries(where).every(
          ([key, value]) => (row as Record<string, unknown>)[key] === value,
        ),
      ) ?? null
    );
  }

  async find(
    options: { where?: Partial<T>; order?: Record<string, 'ASC' | 'DESC'>; take?: number } = {},
  ): Promise<T[]> {
    let result = options.where
      ? this.rows.filter((row) =>
          Object.entries(options.where as Partial<T>).every(
            ([key, value]) => (row as Record<string, unknown>)[key] === value,
          ),
        )
      : [...this.rows];

    if (options.order) {
      const [key, direction] = Object.entries(options.order)[0];
      result = [...result].sort((left, right) => {
        const diff =
          (left as Record<string, number>)[key] - (right as Record<string, number>)[key];
        return direction === 'DESC' ? -diff : diff;
      });
    }

    if (options.take !== undefined) {
      result = result.slice(0, options.take);
    }

    return result;
  }
}

class FakeManager {
  constructor(
    public readonly fights: FakeRepository<FightTypeOrmEntity>,
    public readonly categories: FakeRepository<CategoryTypeOrmEntity>,
    public readonly areaQueueItems: FakeRepository<AreaQueueItemTypeOrmEntity>,
  ) {}

  getRepository(entity: unknown) {
    if (entity === FightTypeOrmEntity) return this.fights;
    if (entity === CategoryTypeOrmEntity) return this.categories;
    if (entity === AreaQueueItemTypeOrmEntity) return this.areaQueueItems;
    throw new Error('Unexpected entity requested from FakeManager');
  }
}

class FakeDataSource {
  constructor(private readonly manager: FakeManager) {}

  async transaction<T>(work: (manager: FakeManager) => Promise<T>): Promise<T> {
    return work(this.manager);
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
    const manager = new FakeManager(
      new FakeRepository<FightTypeOrmEntity>(fights),
      new FakeRepository<CategoryTypeOrmEntity>(categories),
      new FakeRepository<AreaQueueItemTypeOrmEntity>([]),
    );
    const dataSource = new FakeDataSource(manager);
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

  it('marks the linked queue item as done and publishes queue.updated', async () => {
    const manager = new FakeManager(
      new FakeRepository<FightTypeOrmEntity>([makeFightRow()]),
      new FakeRepository<CategoryTypeOrmEntity>([]),
      new FakeRepository<AreaQueueItemTypeOrmEntity>([
        {
          id: 5,
          areaId: 2,
          fightId: 1,
          position: 1,
          status: AreaQueueItemStatus.CALLED,
        },
      ]),
    );
    const useCase = new MarkFightWinnerUseCase(
      new FakeDataSource(manager) as never,
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
