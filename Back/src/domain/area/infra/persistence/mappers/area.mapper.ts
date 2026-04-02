import { Area } from '../../../domain/entities/area.entity';
import { AreaQueueItem } from '../../../domain/entities/area-queue-item.entity';
import { AreaTypeOrmEntity } from '../entities/area.typeorm-entity';
import { AreaQueueItemTypeOrmEntity } from '../entities/area-queue-item.typeorm-entity';

export class AreaMapper {
  static toDomain(entity: AreaTypeOrmEntity): Area {
    return Area.restore({
      id: entity.id,
      competitionId: entity.competitionId,
      name: entity.name,
      order: entity.order,
      createdAt: entity.createdAt,
    });
  }

  static toPersistence(area: Area): AreaTypeOrmEntity {
    const entity = new AreaTypeOrmEntity();
    entity.id = area.id as number;
    entity.competitionId = area.competitionId;
    entity.name = area.name;
    entity.order = area.order;
    entity.createdAt = area.createdAt;
    return entity;
  }

  static queueItemToDomain(entity: AreaQueueItemTypeOrmEntity): AreaQueueItem {
    return AreaQueueItem.restore({
      id: entity.id,
      areaId: entity.areaId,
      fightId: entity.fightId,
      position: entity.position,
      status: entity.status,
    });
  }

  static queueItemToPersistence(item: AreaQueueItem): AreaQueueItemTypeOrmEntity {
    const entity = new AreaQueueItemTypeOrmEntity();
    entity.id = item.id as number;
    entity.areaId = item.areaId;
    entity.fightId = item.fightId;
    entity.position = item.position;
    entity.status = item.status;
    return entity;
  }
}
