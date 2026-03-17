import { Competition } from '../../../domain/entities/competition.entity';
import { CompetitionTypeOrmEntity } from '../entities/competition.typeorm-entity';

export class CompetitionMapper {
  static toDomain(entity: CompetitionTypeOrmEntity): Competition {
    return Competition.restore({
      id: entity.id,
      name: entity.name,
      mode: entity.mode,
      fightDurationSeconds: entity.fightDurationSeconds,
      weighInMarginGrams: entity.weighInMarginGrams,
      ageSplitYears: entity.ageSplitYears,
      createdAt: entity.createdAt,
    });
  }

  static toPersistence(competition: Competition): CompetitionTypeOrmEntity {
    const entity = new CompetitionTypeOrmEntity();
    entity.id = competition.id as number;
    entity.name = competition.name;
    entity.mode = competition.mode;
    entity.fightDurationSeconds = competition.fightDurationSeconds;
    entity.weighInMarginGrams = competition.weighInMarginGrams;
    entity.ageSplitYears = competition.ageSplitYears;
    entity.createdAt = competition.createdAt;
    return entity;
  }
}
