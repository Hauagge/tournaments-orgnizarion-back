import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../../domain/entities/category.entity';
import {
  CategoryAssignment,
  ICategoryRepository,
} from '../../repository/ICategoryRepository.repository';
import { CategoryAthleteTypeOrmEntity } from './entities/category-athlete.typeorm-entity';
import { CategoryTypeOrmEntity } from './entities/category.typeorm-entity';
import { CategoryMapper } from './mappers/category.mapper';

@Injectable()
export class CategoryRepository implements ICategoryRepository {
  constructor(
    @InjectRepository(CategoryTypeOrmEntity)
    private readonly categoryRepository: Repository<CategoryTypeOrmEntity>,
    @InjectRepository(CategoryAthleteTypeOrmEntity)
    private readonly categoryAthleteRepository: Repository<CategoryAthleteTypeOrmEntity>,
  ) {}

  async replaceCompetitionCategories(input: {
    competitionId: number;
    assignments: CategoryAssignment[];
  }): Promise<Category[]> {
    return this.categoryRepository.manager.transaction(async (manager) => {
      await manager.delete(CategoryTypeOrmEntity, {
        competitionId: input.competitionId,
      });

      if (input.assignments.length === 0) {
        return [];
      }

      const savedCategories = await manager.save(
        CategoryTypeOrmEntity,
        input.assignments.map((assignment) =>
          manager.create(
            CategoryTypeOrmEntity,
            CategoryMapper.toPersistence(assignment.category),
          ),
        ),
      );

      const categoryAthletes = savedCategories.flatMap((savedCategory, index) =>
        input.assignments[index].athleteIds.map((athleteId) =>
          manager.create(CategoryAthleteTypeOrmEntity, {
            categoryId: savedCategory.id,
            athleteId,
          }),
        ),
      );

      if (categoryAthletes.length > 0) {
        await manager.save(CategoryAthleteTypeOrmEntity, categoryAthletes);
      }

      return savedCategories.map(CategoryMapper.toDomain);
    });
  }

  async listByCompetitionId(competitionId: number): Promise<Category[]> {
    const entities = await this.categoryRepository.find({
      where: { competitionId },
      order: {
        ageMin: 'ASC',
        weightMinGrams: 'ASC',
        name: 'ASC',
      },
    });

    return entities.map(CategoryMapper.toDomain);
  }

  async findById(id: number): Promise<Category | null> {
    const entity = await this.categoryRepository.findOneBy({ id });
    return entity ? CategoryMapper.toDomain(entity) : null;
  }

  async listAthleteIdsByCategoryId(categoryId: number): Promise<number[]> {
    const entities = await this.categoryAthleteRepository.find({
      where: { categoryId },
      order: { athleteId: 'ASC' },
    });

    return entities.map((entity) => entity.athleteId);
  }
}
