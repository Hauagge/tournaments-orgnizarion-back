import { FightEntity } from '../../../domain/entities/fight.entity';
import { FightTypeOrmEntity } from '../../../entities/fight.typeorm-entity';

export class FightMapper {
  static toDomain(entity: FightTypeOrmEntity): FightEntity {
    return FightEntity.restore({
      id: entity.id,
      competitionId: entity.competitionId,
      categoryId: entity.categoryId,
      keyGroupId: entity.keyGroupId,
      areaId: entity.areaId,
      areaName: entity?.area?.name || null,
      status: entity.status,
      athleteAId: entity.athleteAId,
      athleteBId: entity.athleteBId,
      winnerAthleteId: entity.winnerAthleteId,
      winType: entity.winType,
      startedAt: entity.startedAt,
      finishedAt: entity.finishedAt,
      orderIndex: entity.orderIndex,
    });
  }

  static toPersistence(fight: FightEntity): FightTypeOrmEntity {
    const entity = new FightTypeOrmEntity();
    entity.id = fight.id as number;
    entity.competitionId = fight.competitionId;
    entity.categoryId = fight.categoryId;
    entity.keyGroupId = fight.keyGroupId;
    entity.areaId = fight.areaId;
    entity.status = fight.status;
    entity.athleteAId = fight.athleteAId;
    entity.athleteBId = fight.athleteBId;
    entity.winnerAthleteId = fight.winnerAthleteId;
    entity.winType = fight.winType;
    entity.startedAt = fight.startedAt;
    entity.finishedAt = fight.finishedAt;
    entity.orderIndex = fight.orderIndex;
    return entity;
  }
}
