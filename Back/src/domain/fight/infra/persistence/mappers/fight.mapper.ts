import { FightEntity } from '../../../domain/entities/fight.entity';
import { FightTypeOrmEntity } from '../../../entities/fight.typeorm-entity';

export class FightMapper {
  static toDomain(entity: FightTypeOrmEntity): FightEntity {
    return FightEntity.restore({
      id: entity.id,
      competitionId: entity.competitionId,
      categoryId: entity.categoryId,
      keyGroupId: entity.keyGroupId,
      round: entity.round,
      order: entity.order,
      areaId: entity.areaId,
      areaName: entity?.area?.name || null,
      status: entity.status,
      athleteAId: entity.athleteAId,
      athleteBId: entity.athleteBId,
      winnerId: entity.winnerId,
      loserId: entity.loserId,
      nextFightId: entity.nextFightId,
      nextFightSlot: entity.nextFightSlot,
      createdManually: entity.createdManually,
      isWo: entity.isWo,
      winType: entity.winType,
      startedAt: entity.startedAt,
      finishedAt: entity.finishedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toPersistence(fight: FightEntity): FightTypeOrmEntity {
    const entity = new FightTypeOrmEntity();
    entity.id = fight.id as number;
    entity.competitionId = fight.competitionId;
    entity.categoryId = fight.categoryId;
    entity.keyGroupId = fight.keyGroupId;
    entity.round = fight.round;
    entity.order = fight.order;
    entity.areaId = fight.areaId;
    entity.status = fight.status;
    entity.athleteAId = fight.athleteAId;
    entity.athleteBId = fight.athleteBId;
    entity.winnerId = fight.winnerId;
    entity.loserId = fight.loserId;
    entity.nextFightId = fight.nextFightId;
    entity.nextFightSlot = fight.nextFightSlot;
    entity.createdManually = fight.createdManually;
    entity.isWo = fight.isWo;
    entity.winType = fight.winType;
    entity.startedAt = fight.startedAt;
    entity.finishedAt = fight.finishedAt;
    entity.createdAt = fight.createdAt;
    entity.updatedAt = fight.updatedAt;
    return entity;
  }
}
