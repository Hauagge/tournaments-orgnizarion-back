import { AreaQueueItem } from '../domain/entities/area-queue-item.entity';

export abstract class IAreaQueueItemRepository {
  abstract createManyQueueItems(items: AreaQueueItem[]): Promise<AreaQueueItem[]>;
  abstract replaceForCompetition(input: {
    competitionId: number;
    items: AreaQueueItem[];
  }): Promise<AreaQueueItem[]>;
  abstract listByAreaId(areaId: number): Promise<AreaQueueItem[]>;
  abstract findByFightId(fightId: number): Promise<AreaQueueItem | null>;
  abstract update(item: AreaQueueItem): Promise<AreaQueueItem>;
}
