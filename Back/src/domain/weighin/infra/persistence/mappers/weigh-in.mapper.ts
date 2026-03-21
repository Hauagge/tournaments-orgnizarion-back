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
      performedBy: entity.performedBy,
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
    entity.performedBy = weighIn.performedBy;
    return entity;
  }
}
