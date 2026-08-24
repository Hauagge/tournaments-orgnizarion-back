import { describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { makeAthlete, makeCategory, makeCompetition } from '../../../../../test/factories';
import {
  InMemoryAthleteRepository,
  InMemoryCategoryRepository,
  InMemoryCompetitionRepository,
} from '../../../../../test/repositories/in-memory';
import { Category } from '../../domain/entities/category.entity';
import { CategoryGenerationService } from '../services/category-generation.service';
import { GenerateCategoriesUseCase } from './generate-categories.use-case';

class StubCategoryGenerationService extends CategoryGenerationService {
  constructor(
    private readonly assignments: { category: Category; athleteIds: number[] }[],
  ) {
    super();
  }

  generate() {
    return this.assignments;
  }
}

describe('GenerateCategoriesUseCase', () => {
  it('throws NotFoundError when the competition does not exist', async () => {
    const useCase = new GenerateCategoriesUseCase(
      new InMemoryCompetitionRepository([]),
      new InMemoryAthleteRepository([]),
      new InMemoryCategoryRepository([]),
      new StubCategoryGenerationService([]),
    );

    await expect(useCase.execute({ competitionId: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('generates categories from the current athletes and replaces them for the competition', async () => {
    const generatedCategory = makeCategory({ id: 1, competitionId: 1, name: 'Adulto Branco Leve' });
    const categoryRepository = new InMemoryCategoryRepository([]);
    const replaceCompetitionCategories = vi.spyOn(
      categoryRepository,
      'replaceCompetitionCategories',
    );
    const useCase = new GenerateCategoriesUseCase(
      new InMemoryCompetitionRepository([makeCompetition({ id: 1 })]),
      new InMemoryAthleteRepository([makeAthlete({ id: 10, competitionId: 1 })]),
      categoryRepository,
      new StubCategoryGenerationService([
        { category: generatedCategory, athleteIds: [10] },
      ]),
    );

    const result = await useCase.execute({ competitionId: 1 });

    expect(result.map((category) => category.name)).toEqual([generatedCategory.name]);
    expect(replaceCompetitionCategories).toHaveBeenCalledWith({
      competitionId: 1,
      assignments: [{ category: generatedCategory, athleteIds: [10] }],
    });
  });
});
