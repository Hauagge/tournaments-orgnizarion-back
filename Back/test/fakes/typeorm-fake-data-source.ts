import { AreaQueueItemTypeOrmEntity } from '@/domain/area/infra/persistence/entities/area-queue-item.typeorm-entity';
import { CategoryTypeOrmEntity } from '@/domain/category/infra/persistence/entities/category.typeorm-entity';
import { FightTypeOrmEntity } from '@/domain/fight/entities/fight.typeorm-entity';
import { KeyGroupTypeOrmEntity } from '@/domain/key-group/infra/persistence/entities/key-group.typeorm-entity';

export class FakeRepository<T extends { id?: number }> {
  private nextId = 1;

  constructor(public rows: T[] = []) {}

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
    options: {
      where?: Partial<T>;
      order?: Record<string, 'ASC' | 'DESC'>;
      take?: number;
    } = {},
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
          (left as Record<string, number>)[key] -
          (right as Record<string, number>)[key];
        return direction === 'DESC' ? -diff : diff;
      });
    }

    if (options.take !== undefined) {
      result = result.slice(0, options.take);
    }

    return result;
  }
}

export class FakeManager {
  constructor(
    public readonly fights: FakeRepository<FightTypeOrmEntity>,
    public readonly categories: FakeRepository<CategoryTypeOrmEntity>,
    public readonly areaQueueItems: FakeRepository<AreaQueueItemTypeOrmEntity>,
    public readonly keyGroups: FakeRepository<KeyGroupTypeOrmEntity>,
  ) {}

  getRepository(entity: unknown) {
    if (entity === FightTypeOrmEntity) return this.fights;
    if (entity === CategoryTypeOrmEntity) return this.categories;
    if (entity === AreaQueueItemTypeOrmEntity) return this.areaQueueItems;
    if (entity === KeyGroupTypeOrmEntity) return this.keyGroups;
    throw new Error('Unexpected entity requested from FakeManager');
  }
}

export class FakeDataSource {
  constructor(private readonly manager: FakeManager) {}

  async transaction<T>(work: (manager: FakeManager) => Promise<T>): Promise<T> {
    return work(this.manager);
  }
}

export function makeFakeDataSource(input: {
  fights?: FightTypeOrmEntity[];
  categories?: CategoryTypeOrmEntity[];
  areaQueueItems?: AreaQueueItemTypeOrmEntity[];
  keyGroups?: KeyGroupTypeOrmEntity[];
}) {
  const manager = new FakeManager(
    new FakeRepository<FightTypeOrmEntity>(input.fights ?? []),
    new FakeRepository<CategoryTypeOrmEntity>(input.categories ?? []),
    new FakeRepository<AreaQueueItemTypeOrmEntity>(input.areaQueueItems ?? []),
    new FakeRepository<KeyGroupTypeOrmEntity>(input.keyGroups ?? []),
  );

  return { manager, dataSource: new FakeDataSource(manager) };
}
