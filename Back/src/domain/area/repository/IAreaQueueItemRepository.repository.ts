import { AreaQueueItem } from '../domain/entities/area-queue-item.entity';
import { AreaQueueFightDetails } from './area-queue-fight-details.type';

export abstract class IAreaQueueItemRepository {
  abstract createManyQueueItems(items: AreaQueueItem[]): Promise<AreaQueueItem[]>;
  abstract replaceForCompetition(input: {
    competitionId: number;
    items: AreaQueueItem[];
  }): Promise<AreaQueueItem[]>;
  abstract listByAreaId(areaId: number): Promise<AreaQueueItem[]>;
  abstract listFightDetailsByAreaId(areaId: number): Promise<AreaQueueFightDetails[]>;
  abstract findByFightId(fightId: number): Promise<AreaQueueItem | null>;
  abstract update(item: AreaQueueItem): Promise<AreaQueueItem>;
}
