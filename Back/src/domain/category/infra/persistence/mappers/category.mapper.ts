import { Category } from '../../../domain/entities/category.entity';
import { CategoryTypeOrmEntity } from '../entities/category.typeorm-entity';

export class CategoryMapper {
  static toDomain(entity: CategoryTypeOrmEntity): Category {
    return Category.restore({
      id: entity.id,
      competitionId: entity.competitionId,
      name: entity.name,
      belt: entity.belt,
      ageMin: entity.ageMin,
      ageMax: entity.ageMax,
      weightMinGrams: entity.weightMinGrams,
      weightMaxGrams: entity.weightMaxGrams,
      totalAthletes: entity.totalAthletes,
      createdAt: entity.createdAt,
    });
  }

  static toPersistence(category: Category): CategoryTypeOrmEntity {
    const entity = new CategoryTypeOrmEntity();
    entity.id = category.id as number;
    entity.competitionId = category.competitionId;
    entity.name = category.name;
    entity.belt = category.belt;
    entity.ageMin = category.ageMin;
    entity.ageMax = category.ageMax;
    entity.weightMinGrams = category.weightMinGrams;
    entity.weightMaxGrams = category.weightMaxGrams;
    entity.totalAthletes = category.totalAthletes;
    entity.createdAt = category.createdAt;
    return entity;
  }
}
