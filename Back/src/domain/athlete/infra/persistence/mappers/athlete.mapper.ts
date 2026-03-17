import { Athlete } from '../../../domain/entities/athlete.entity';
import { AthleteTypeOrmEntity } from '../entities/athlete.typeorm-entity';

export class AthleteMapper {
  static toDomain(entity: AthleteTypeOrmEntity): Athlete {
    return Athlete.restore({
      id: entity.id,
      competitionId: entity.competitionId,
      fullName: entity.fullName,
      birthDate: new Date(entity.birthDate),
      belt: entity.belt,
      declaredWeightGrams: entity.declaredWeightGrams,
      teamId: entity.teamId,
      createdAt: entity.createdAt,
    });
  }

  static toPersistence(athlete: Athlete): AthleteTypeOrmEntity {
    const entity = new AthleteTypeOrmEntity();
    entity.id = athlete.id as number;
    entity.competitionId = athlete.competitionId;
    entity.fullName = athlete.fullName;
    entity.birthDate = athlete.birthDate;
    entity.belt = athlete.belt;
    entity.declaredWeightGrams = athlete.declaredWeightGrams;
    entity.teamId = athlete.teamId;
    entity.createdAt = athlete.createdAt;
    return entity;
  }
}
