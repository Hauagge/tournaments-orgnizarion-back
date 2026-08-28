import { AreaQueueItem } from '@/domain/area/domain/entities/area-queue-item.entity';
import { AreaQueueFightDetails } from '@/domain/area/repository/area-queue-fight-details.type';
import { IAreaQueueItemRepository } from '@/domain/area/repository/IAreaQueueItemRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';

export class InMemoryAreaQueueItemRepository
  implements IAreaQueueItemRepository
{
  private nextId = 1;
  public items: AreaQueueItem[] = [];
  public fightDetailsByAreaId = new Map<number, AreaQueueFightDetails[]>();

  constructor(items: AreaQueueItem[] = []) {
    this.items = items.map((item) => this.withId(item));
  }

  async createManyQueueItems(items: AreaQueueItem[]): Promise<AreaQueueItem[]> {
    const created = items.map((item) => this.withId(item));
    this.items = [...this.items, ...created];

    return created;
  }

  async replaceForCompetition(input: {
    competitionId: number;
    items: AreaQueueItem[];
  }): Promise<AreaQueueItem[]> {
    const replacedAreaIds = new Set(input.items.map((item) => item.areaId));
    this.items = this.items.filter((item) => !replacedAreaIds.has(item.areaId));

    return this.createManyQueueItems(input.items);
  }

  async listByAreaId(areaId: number): Promise<AreaQueueItem[]> {
    return this.sortByPosition(
      this.items.filter((item) => item.areaId === areaId),
    );
  }

  async listByAreaIds(areaIds: number[]): Promise<AreaQueueItem[]> {
    return this.sortByPosition(
      this.items.filter((item) => areaIds.includes(item.areaId)),
    );
  }

  async replaceForAreas(input: {
    areaIds: number[];
    items: AreaQueueItem[];
  }): Promise<AreaQueueItem[]> {
    this.items = this.items.filter(
      (item) => !input.areaIds.includes(item.areaId),
    );
    this.items = [...this.items, ...input.items];

    return input.items;
  }

  async listFightDetailsByAreaId(
    areaId: number,
  ): Promise<AreaQueueFightDetails[]> {
    return this.fightDetailsByAreaId.get(areaId) ?? [];
  }

  async findByFightId(fightId: number): Promise<AreaQueueItem | null> {
    return (
      this.sortByPosition(this.items).find(
        (item) => item.fightId === fightId,
      ) ?? null
    );
  }

  async update(item: AreaQueueItem): Promise<AreaQueueItem> {
    const index = this.items.findIndex((current) => current.id === item.id);

    if (index < 0) {
      throw new NotFoundError(
        `AreaQueueItem with id ${item.id as number} not found`,
      );
    }

    this.items[index] = item;

    return item;
  }

  /** Escape hatch para specs que precisam de detalhes de luta na fila. */
  setFightDetails(areaId: number, details: AreaQueueFightDetails[]): void {
    this.fightDetailsByAreaId.set(areaId, details);
  }

  private withId(item: AreaQueueItem): AreaQueueItem {
    if (item.id !== undefined) {
      this.nextId = Math.max(this.nextId, item.id + 1);
      return item;
    }

    return AreaQueueItem.restore({ ...item.toJSON(), id: this.nextId++ });
  }

  private sortByPosition(items: AreaQueueItem[]): AreaQueueItem[] {
    return [...items].sort(
      (left, right) =>
        left.position - right.position || (left.id ?? 0) - (right.id ?? 0),
    );
  }
}
