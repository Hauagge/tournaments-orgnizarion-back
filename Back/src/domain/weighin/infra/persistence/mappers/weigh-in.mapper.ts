import { WeighIn } from '../../../domain/entities/weigh-in.entity';
import { WeighInTypeOrmEntity } from '../entities/weigh-in.typeorm-entity';

export class WeighInMapper {
  static toDomain(entity: WeighInTypeOrmEntity): WeighIn {
    return WeighIn.restore({
      id: entity.id,
      competitionId: entity.competitionId,
      athleteId: entity.athleteId,
      measuredWeightGrams: entity.measuredWeightGrams,
      status: entity.status,
      performedAt: entity.performedAt,
      performedById: entity.performedById,
      performedBy: entity.performedBy,
      observation: entity.observation,
    });
  }

  static toPersistence(weighIn: WeighIn): WeighInTypeOrmEntity {
    const entity = new WeighInTypeOrmEntity();
    entity.id = weighIn.id as number;
    entity.competitionId = weighIn.competitionId;
    entity.athleteId = weighIn.athleteId;
    entity.measuredWeightGrams = weighIn.measuredWeightGrams;
    entity.status = weighIn.status;
    entity.performedAt = weighIn.performedAt;
    entity.performedById = weighIn.performedById;
    entity.performedBy = weighIn.performedBy;
    entity.observation = weighIn.observation;
    return entity;
  }
}
