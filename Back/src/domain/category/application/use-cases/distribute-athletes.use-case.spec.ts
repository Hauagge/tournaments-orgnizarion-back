import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { makeAthlete, makeCategory, makeCompetition } from '../../../../../test/factories';
import {
  InMemoryAthleteRepository,
  InMemoryCategoryRepository,
  InMemoryCompetitionRepository,
  InMemoryWeighInRepository,
} from '../../../../../test/repositories/in-memory';
import {
  CategoryDistributionResult,
  CategoryDistributionService,
  DistributionRejectionReason,
} from '../services/category-distribution.service';
import { DistributeAthletesUseCase } from './distribute-athletes.use-case';

class StubCategoryDistributionService extends CategoryDistributionService {
  constructor(private readonly result: CategoryDistributionResult) {
    super({} as never);
  }

  distribute(): CategoryDistributionResult {
    return this.result;
  }
}

describe('DistributeAthletesUseCase', () => {
  let competitionRepository: InMemoryCompetitionRepository;
  let categoryRepository: InMemoryCategoryRepository;
  let athleteRepository: InMemoryAthleteRepository;
  let weighInRepository: InMemoryWeighInRepository;

  beforeEach(() => {
    competitionRepository = new InMemoryCompetitionRepository([
      makeCompetition({ id: 1 }),
    ]);
    categoryRepository = new InMemoryCategoryRepository([
      makeCategory({ id: 1, competitionId: 1, name: 'Adulto Branco Leve' }),
    ]);
    athleteRepository = new InMemoryAthleteRepository([
      makeAthlete({ id: 10, competitionId: 1, fullName: 'Alice' }),
    ]);
    weighInRepository = new InMemoryWeighInRepository();
  });

  it('throws NotFoundError when the competition does not exist', async () => {
    const useCase = new DistributeAthletesUseCase(
      competitionRepository,
      categoryRepository,
      athleteRepository,
      weighInRepository,
      new StubCategoryDistributionService({ allocated: [], rejected: [] }),
    );

    await expect(useCase.execute({ competitionId: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws ValidationError when there are no categories registered', async () => {
    categoryRepository = new InMemoryCategoryRepository([]);
    const useCase = new DistributeAthletesUseCase(
      competitionRepository,
      categoryRepository,
      athleteRepository,
      weighInRepository,
      new StubCategoryDistributionService({ allocated: [], rejected: [] }),
    );

    await expect(useCase.execute({ competitionId: 1 })).rejects.toBeInstanceOf(ValidationError);
  });

  it('groups allocated athletes by category and persists the assignments', async () => {
    const addAthletesToCategories = vi.spyOn(categoryRepository, 'addAthletesToCategories');
    const findWeighIns = vi.spyOn(weighInRepository, 'findByCompetitionIdAndAthleteIds');
    const useCase = new DistributeAthletesUseCase(
      competitionRepository,
      categoryRepository,
      athleteRepository,
      weighInRepository,
      new StubCategoryDistributionService({
        allocated: [{ athleteId: 10, categoryId: 1 }],
        rejected: [],
      }),
    );

    const result = await useCase.execute({ competitionId: 1 });

    expect(findWeighIns).toHaveBeenCalledWith(1, [10]);
    expect(addAthletesToCategories).toHaveBeenCalledWith([
      { categoryId: 1, athleteIds: [10] },
    ]);
    expect(result.summary).toEqual({
      totalEligible: 1,
      totalAllocated: 1,
      totalRejected: 0,
    });
    expect(result.allocations).toEqual([
      expect.objectContaining({
        categoryId: 1,
        categoryName: 'Adulto Branco Leve',
        athletes: [{ id: 10, fullName: 'Alice' }],
      }),
    ]);
    expect(result.rejected).toEqual([]);
  });

  it('reports rejected athletes with their reason', async () => {
    const addAthletesToCategories = vi.spyOn(categoryRepository, 'addAthletesToCategories');
    const useCase = new DistributeAthletesUseCase(
      competitionRepository,
      categoryRepository,
      athleteRepository,
      weighInRepository,
      new StubCategoryDistributionService({
        allocated: [],
        rejected: [
          {
            athleteId: 10,
            reason: DistributionRejectionReason.NO_MATCHING_CATEGORY,
            detail: 'Nenhuma categoria compativel',
          },
        ],
      }),
    );

    const result = await useCase.execute({ competitionId: 1 });

    expect(addAthletesToCategories).not.toHaveBeenCalled();
    expect(result.rejected).toEqual([
      expect.objectContaining({
        athleteId: 10,
        fullName: 'Alice',
        reason: DistributionRejectionReason.NO_MATCHING_CATEGORY,
      }),
    ]);
  });
});
