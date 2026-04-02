import { Academy } from '../../../domain/entities/academy.entity';
import { AcademyTypeOrmEntity } from '../entities/academy.typeorm-entity';

export class AcademyMapper {
  static toDomain(entity: AcademyTypeOrmEntity): Academy {
    return Academy.restore({
      id: entity.id,
      competitionId: entity.competitionId,
      name: entity.name,
      createdAt: entity.createdAt,
    });
  }

  static toPersistence(academy: Academy): AcademyTypeOrmEntity {
    const entity = new AcademyTypeOrmEntity();
    entity.id = academy.id as number;
    entity.competitionId = academy.competitionId;
    entity.name = academy.name;
    entity.createdAt = academy.createdAt;
    return entity;
  }
}
