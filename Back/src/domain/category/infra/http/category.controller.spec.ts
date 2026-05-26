import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeCategory, makeAthlete } from '../../../../../test/factories';
import { AddAthleteToCategoryUseCase } from '../../application/use-cases/add-athlete-to-category.use-case';
import { CreateCategoryUseCase } from '../../application/use-cases/create-category.use-case';
import { DistributeAthletesUseCase } from '../../application/use-cases/distribute-athletes.use-case';
import { GenerateCategoriesUseCase } from '../../application/use-cases/generate-categories.use-case';
import { GetCategoryUseCase } from '../../application/use-cases/get-category.use-case';
import { ListCategoriesUseCase } from '../../application/use-cases/list-categories.use-case';
import { CategoryController } from './category.controller';

describe('CategoryController', () => {
  const addAthleteToCategoryUseCase = {
    execute: vi.fn(),
  } as unknown as AddAthleteToCategoryUseCase;
  const createCategoryUseCase = {
    execute: vi.fn(),
  } as unknown as CreateCategoryUseCase;
  const generateCategoriesUseCase = {
    execute: vi.fn(),
  } as unknown as GenerateCategoriesUseCase;
  const distributeAthletesUseCase = {
    execute: vi.fn(),
  } as unknown as DistributeAthletesUseCase;
  const listCategoriesUseCase = {
    execute: vi.fn(),
  } as unknown as ListCategoriesUseCase;
  const getCategoryUseCase = {
    execute: vi.fn(),
  } as unknown as GetCategoryUseCase;

  const controller = new CategoryController(
    addAthleteToCategoryUseCase,
    createCategoryUseCase,
    generateCategoriesUseCase,
    distributeAthletesUseCase,
    listCategoriesUseCase,
    getCategoryUseCase,
  );

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should add athlete and return wrapped response', async () => {
    vi.mocked(addAthleteToCategoryUseCase.execute).mockResolvedValue({
      competitionId: 1,
      categoryId: 10,
      categoryName: makeCategory({ id: 10 }).name,
      athleteId: 7,
      athleteName: makeAthlete({ id: 7 }).fullName,
    });

    const result = await controller.addAthlete({
      competitionId: 1,
      categoryId: 10,
    }, {
      athleteId: 7,
    });

    expect(addAthleteToCategoryUseCase.execute).toHaveBeenCalledWith({
      competitionId: 1,
      categoryId: 10,
      athleteId: 7,
    });
    expect(result).toEqual({
      data: {
        competitionId: 1,
        categoryId: 10,
        categoryName: makeCategory({ id: 10 }).name,
        athleteId: 7,
        athleteName: makeAthlete({ id: 7 }).fullName,
      },
      error: null,
    });
  });
});
