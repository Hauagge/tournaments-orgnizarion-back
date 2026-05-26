import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Category } from '../../domain/entities/category.entity';
import {
  CategoryAssignment,
  CategoryAthleteAddition,
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

  async create(category: Category): Promise<Category> {
    const entity = this.categoryRepository.create(
      CategoryMapper.toPersistence(category),
    );
    const saved = await this.categoryRepository.save(entity);
    return CategoryMapper.toDomain(saved);
  }

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

  async update(category: Category): Promise<Category> {
    await this.categoryRepository.update(category.id as number, {
      name: category.name,
      belt: category.belt,
      allowMerge: category.allowMerge,
      mergeWithBelt: category.mergeWithBelt,
      ageMin: category.ageMin,
      ageMax: category.ageMax,
      weightMinGrams: category.weightMinGrams,
      weightMaxGrams: category.weightMaxGrams,
      totalAthletes: category.totalAthletes,
      championAthleteId: category.championAthleteId,
    });

    const entity = await this.categoryRepository.findOneBy({
      id: category.id as number,
    });

    if (!entity) {
      return category;
    }

    return CategoryMapper.toDomain(entity);
  }

  async listAthleteIdsByCategoryId(categoryId: number): Promise<number[]> {
    const entities = await this.categoryAthleteRepository.find({
      where: { categoryId },
      order: { athleteId: 'ASC' },
    });

    return entities.map((entity) => entity.athleteId);
  }

  async listAthleteIdsByCompetitionId(
    competitionId: number,
  ): Promise<number[]> {
    const rows = await this.categoryAthleteRepository
      .createQueryBuilder('ca')
      .innerJoin(
        CategoryTypeOrmEntity,
        'c',
        'c.id = ca.category_id',
      )
      .where('c.competition_id = :competitionId', { competitionId })
      .select('ca.athlete_id', 'athleteId')
      .getRawMany<{ athleteId: number }>();

    return rows.map((row) => Number(row.athleteId));
  }

  async addAthletesToCategories(
    additions: CategoryAthleteAddition[],
  ): Promise<void> {
    const filtered = additions.filter(
      (addition) => addition.athleteIds.length > 0,
    );

    if (filtered.length === 0) {
      return;
    }

    await this.categoryRepository.manager.transaction(async (manager) => {
      const categoryIds = filtered.map((addition) => addition.categoryId);
      const existing = await manager.find(CategoryAthleteTypeOrmEntity, {
        where: { categoryId: In(categoryIds) },
      });
      const existingKeys = new Set(
        existing.map((entity) => `${entity.categoryId}:${entity.athleteId}`),
      );

      const rowsToInsert: { categoryId: number; athleteId: number }[] = [];
      const additionCountByCategory = new Map<number, number>();

      for (const addition of filtered) {
        let added = 0;

        for (const athleteId of addition.athleteIds) {
          const key = `${addition.categoryId}:${athleteId}`;
          if (existingKeys.has(key)) {
            continue;
          }
          existingKeys.add(key);
          rowsToInsert.push({ categoryId: addition.categoryId, athleteId });
          added += 1;
        }

        if (added > 0) {
          additionCountByCategory.set(addition.categoryId, added);
        }
      }

      if (rowsToInsert.length === 0) {
        return;
      }

      await manager.insert(CategoryAthleteTypeOrmEntity, rowsToInsert);

      await Promise.all(
        Array.from(additionCountByCategory.entries()).map(
          ([categoryId, count]) =>
            manager.increment(
              CategoryTypeOrmEntity,
              { id: categoryId },
              'totalAthletes',
              count,
            ),
        ),
      );
    });
  }
}
