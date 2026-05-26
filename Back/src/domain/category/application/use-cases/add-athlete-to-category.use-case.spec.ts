import { beforeEach, describe, expect, it } from 'vitest';
import { WeighIn } from '@/domain/weighin/domain/entities/weigh-in.entity';
import { WeighInStatus } from '@/domain/weighin/domain/value-objects/weigh-in-status.enum';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import {
  makeAthlete,
  makeCategory,
  makeCompetition,
} from '../../../../../test/factories';
import {
  InMemoryAthleteRepository,
  InMemoryCategoryRepository,
  InMemoryCompetitionRepository,
  InMemoryWeighInRepository,
} from '../../../../../test/repositories/in-memory';
import { CategoryEligibilityService } from '../services/category-eligibility.service';
import { AddAthleteToCategoryUseCase } from './add-athlete-to-category.use-case';

describe('AddAthleteToCategoryUseCase', () => {
  let competitionRepository: InMemoryCompetitionRepository;
  let categoryRepository: InMemoryCategoryRepository;
  let athleteRepository: InMemoryAthleteRepository;
  let weighInRepository: InMemoryWeighInRepository;
  let useCase: AddAthleteToCategoryUseCase;

  beforeEach(() => {
    competitionRepository = new InMemoryCompetitionRepository([
      makeCompetition({ id: 1 }),
      makeCompetition({ id: 2 }),
    ]);
    categoryRepository = new InMemoryCategoryRepository();
    athleteRepository = new InMemoryAthleteRepository();
    weighInRepository = new InMemoryWeighInRepository();
    useCase = new AddAthleteToCategoryUseCase(
      competitionRepository,
      categoryRepository,
      athleteRepository,
      weighInRepository,
      new CategoryEligibilityService(),
    );
  });

  it('should add valid athlete to valid category', async () => {
    categoryRepository.setCategories([
      makeCategory({
        id: 10,
        competitionId: 1,
        belt: 'white',
        ageMin: 15,
        ageMax: 20,
        weightMinGrams: 45000,
        weightMaxGrams: 55000,
      }),
    ]);
    athleteRepository.setAthletes([
      makeAthlete({
        id: 99,
        competitionId: 1,
        fullName: 'Joao Silva',
        belt: 'white',
        birthDate: new Date('2010-05-10T00:00:00.000Z'),
        declaredWeight: 50000,
      }),
    ]);
    weighInRepository.setWeighIns([approvedWeighIn(1, 99, 50000)]);

    const result = await useCase.execute({
      competitionId: 1,
      categoryId: 10,
      athleteId: 99,
    });

    expect(result).toEqual({
      competitionId: 1,
      categoryId: 10,
      categoryName: 'Adulto Branco Leve',
      athleteId: 99,
      athleteName: 'Joao Silva',
    });
    await expect(
      categoryRepository.listAthleteIdsByCategoryId(10),
    ).resolves.toEqual([99]);
  });

  it('should block nonexistent category', async () => {
    athleteRepository.setAthletes([makeAthlete({ id: 7, competitionId: 1 })]);

    await expect(
      useCase.execute({ competitionId: 1, categoryId: 500, athleteId: 7 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should block nonexistent athlete', async () => {
    categoryRepository.setCategories([
      makeCategory({ id: 10, competitionId: 1 }),
    ]);

    await expect(
      useCase.execute({ competitionId: 1, categoryId: 10, athleteId: 700 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should block category from another competition', async () => {
    categoryRepository.setCategories([
      makeCategory({ id: 10, competitionId: 2 }),
    ]);
    athleteRepository.setAthletes([makeAthlete({ id: 7, competitionId: 1 })]);

    await expect(
      useCase.execute({ competitionId: 1, categoryId: 10, athleteId: 7 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('should block athlete from another competition', async () => {
    categoryRepository.setCategories([
      makeCategory({ id: 10, competitionId: 1 }),
    ]);
    athleteRepository.setAthletes([makeAthlete({ id: 7, competitionId: 2 })]);

    await expect(
      useCase.execute({ competitionId: 1, categoryId: 10, athleteId: 7 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('should block duplicated link', async () => {
    categoryRepository = new InMemoryCategoryRepository(
      [makeCategory({ id: 10, competitionId: 1 })],
      [{ categoryId: 10, athleteId: 7 }],
    );
    athleteRepository.setAthletes([makeAthlete({ id: 7, competitionId: 1 })]);
    weighInRepository.setWeighIns([approvedWeighIn(1, 7, 65000)]);
    useCase = new AddAthleteToCategoryUseCase(
      competitionRepository,
      categoryRepository,
      athleteRepository,
      weighInRepository,
      new CategoryEligibilityService(),
    );

    await expect(
      useCase.execute({ competitionId: 1, categoryId: 10, athleteId: 7 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('should block athlete with incompatible belt', async () => {
    categoryRepository.setCategories([
      makeCategory({ id: 10, competitionId: 1, belt: 'blue' }),
    ]);
    athleteRepository.setAthletes([
      makeAthlete({ id: 7, competitionId: 1, belt: 'white' }),
    ]);
    weighInRepository.setWeighIns([approvedWeighIn(1, 7, 65000)]);

    await expect(
      useCase.execute({ competitionId: 1, categoryId: 10, athleteId: 7 }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        error: expect.objectContaining({
          details: expect.objectContaining({
            reasons: expect.arrayContaining([
              'Categoria aceita apenas a faixa blue',
            ]),
          }),
        }),
      }),
    });
  });

  it('should allow athlete by valid belt merge', async () => {
    categoryRepository.setCategories([
      makeCategory({
        id: 10,
        competitionId: 1,
        belt: 'blue',
        allowMerge: true,
        mergeWithBelt: 'white',
        ageMin: null,
        ageMax: null,
      }),
    ]);
    athleteRepository.setAthletes([
      makeAthlete({ id: 7, competitionId: 1, belt: 'white' }),
    ]);
    weighInRepository.setWeighIns([approvedWeighIn(1, 7, 65000)]);

    const result = await useCase.execute({
      competitionId: 1,
      categoryId: 10,
      athleteId: 7,
    });

    expect(result.categoryId).toBe(10);
  });

  it('should block athlete by invalid belt merge', async () => {
    categoryRepository.setCategories([
      makeCategory({
        id: 10,
        competitionId: 1,
        belt: 'blue',
        allowMerge: true,
        mergeWithBelt: 'purple',
      }),
    ]);
    athleteRepository.setAthletes([
      makeAthlete({ id: 7, competitionId: 1, belt: 'white' }),
    ]);
    weighInRepository.setWeighIns([approvedWeighIn(1, 7, 65000)]);

    await expect(
      useCase.execute({ competitionId: 1, categoryId: 10, athleteId: 7 }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        error: expect.objectContaining({
          details: expect.objectContaining({
            reasons: expect.arrayContaining([
              'Faixa white não permitida na categoria',
            ]),
          }),
        }),
      }),
    });
  });

  it('should block athlete below minimum weight', async () => {
    categoryRepository.setCategories([
      makeCategory({
        id: 10,
        competitionId: 1,
        weightMinGrams: 60000,
        weightMaxGrams: 70000,
      }),
    ]);
    athleteRepository.setAthletes([
      makeAthlete({ id: 7, competitionId: 1, declaredWeight: 59000 }),
    ]);
    weighInRepository.setWeighIns([approvedWeighIn(1, 7, 59000)]);

    await expect(
      useCase.execute({ competitionId: 1, categoryId: 10, athleteId: 7 }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        error: expect.objectContaining({
          details: expect.objectContaining({
            reasons: expect.arrayContaining([
              'Peso 59.000kg abaixo do mínimo da categoria',
            ]),
          }),
        }),
      }),
    });
  });

  it('should block athlete above maximum weight', async () => {
    categoryRepository.setCategories([
      makeCategory({
        id: 10,
        competitionId: 1,
        weightMinGrams: 60000,
        weightMaxGrams: 70000,
      }),
    ]);
    athleteRepository.setAthletes([
      makeAthlete({ id: 7, competitionId: 1, declaredWeight: 71000 }),
    ]);
    weighInRepository.setWeighIns([approvedWeighIn(1, 7, 71000)]);

    await expect(
      useCase.execute({ competitionId: 1, categoryId: 10, athleteId: 7 }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        error: expect.objectContaining({
          details: expect.objectContaining({
            reasons: expect.arrayContaining([
              'Peso 71.000kg acima do máximo da categoria',
            ]),
          }),
        }),
      }),
    });
  });

  it('should block athlete below minimum age', async () => {
    categoryRepository.setCategories([
      makeCategory({ id: 10, competitionId: 1, ageMin: 18, ageMax: 30 }),
    ]);
    athleteRepository.setAthletes([
      makeAthlete({
        id: 7,
        competitionId: 1,
        birthDate: new Date('2012-05-10T00:00:00.000Z'),
      }),
    ]);
    weighInRepository.setWeighIns([approvedWeighIn(1, 7, 65000)]);

    await expect(
      useCase.execute({ competitionId: 1, categoryId: 10, athleteId: 7 }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        error: expect.objectContaining({
          details: expect.objectContaining({
            reasons: expect.arrayContaining([
              'Idade 14 abaixo do mínimo da categoria',
            ]),
          }),
        }),
      }),
    });
  });

  it('should block athlete above maximum age', async () => {
    categoryRepository.setCategories([
      makeCategory({ id: 10, competitionId: 1, ageMin: 10, ageMax: 12 }),
    ]);
    athleteRepository.setAthletes([
      makeAthlete({
        id: 7,
        competitionId: 1,
        birthDate: new Date('2000-05-10T00:00:00.000Z'),
      }),
    ]);
    weighInRepository.setWeighIns([approvedWeighIn(1, 7, 65000)]);

    await expect(
      useCase.execute({ competitionId: 1, categoryId: 10, athleteId: 7 }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        error: expect.objectContaining({
          details: expect.objectContaining({
            reasons: expect.arrayContaining([
              'Idade 26 acima do máximo da categoria',
            ]),
          }),
        }),
      }),
    });
  });

  it('should allow category without weight limit', async () => {
    categoryRepository.setCategories([
      makeCategory({
        id: 10,
        competitionId: 1,
        weightMinGrams: null,
        weightMaxGrams: null,
        ageMin: null,
        ageMax: null,
      }),
    ]);
    athleteRepository.setAthletes([
      makeAthlete({ id: 7, competitionId: 1, declaredWeight: 99000 }),
    ]);
    weighInRepository.setWeighIns([approvedWeighIn(1, 7, 99000)]);

    const result = await useCase.execute({
      competitionId: 1,
      categoryId: 10,
      athleteId: 7,
    });

    expect(result.athleteId).toBe(7);
  });

  it('should allow category without age limit', async () => {
    categoryRepository.setCategories([
      makeCategory({
        id: 10,
        competitionId: 1,
        ageMin: null,
        ageMax: null,
      }),
    ]);
    athleteRepository.setAthletes([
      makeAthlete({
        id: 7,
        competitionId: 1,
        birthDate: new Date('1990-05-10T00:00:00.000Z'),
      }),
    ]);
    weighInRepository.setWeighIns([approvedWeighIn(1, 7, 65000)]);

    const result = await useCase.execute({
      competitionId: 1,
      categoryId: 10,
      athleteId: 7,
    });

    expect(result.athleteId).toBe(7);
  });

  it('should not remove athlete from another category automatically', async () => {
    categoryRepository = new InMemoryCategoryRepository(
      [
        makeCategory({ id: 10, competitionId: 1 }),
        makeCategory({ id: 11, competitionId: 1 }),
      ],
      [{ categoryId: 11, athleteId: 7 }],
    );
    athleteRepository.setAthletes([makeAthlete({ id: 7, competitionId: 1 })]);
    weighInRepository.setWeighIns([approvedWeighIn(1, 7, 65000)]);
    useCase = new AddAthleteToCategoryUseCase(
      competitionRepository,
      categoryRepository,
      athleteRepository,
      weighInRepository,
      new CategoryEligibilityService(),
    );

    await expect(
      useCase.execute({ competitionId: 1, categoryId: 10, athleteId: 7 }),
    ).rejects.toBeInstanceOf(ValidationError);

    await expect(
      categoryRepository.listAthleteIdsByCategoryId(11),
    ).resolves.toEqual([7]);
    await expect(
      categoryRepository.listAthleteIdsByCategoryId(10),
    ).resolves.toEqual([]);
  });

  it('should return multiple reasons when more than one rule blocks the athlete', async () => {
    categoryRepository.setCategories([
      makeCategory({
        id: 10,
        competitionId: 1,
        belt: 'blue',
        ageMin: 18,
        ageMax: 20,
        weightMinGrams: 60000,
        weightMaxGrams: 70000,
      }),
    ]);
    athleteRepository.setAthletes([
      makeAthlete({
        id: 7,
        competitionId: 1,
        belt: 'white',
        birthDate: new Date('2012-05-10T00:00:00.000Z'),
        declaredWeight: 71000,
      }),
    ]);
    weighInRepository.setWeighIns([approvedWeighIn(1, 7, 71000)]);

    await expect(
      useCase.execute({ competitionId: 1, categoryId: 10, athleteId: 7 }),
    ).rejects.toMatchObject({
      response: {
        error: {
          message: 'Atleta não pode ser adicionado a esta categoria.',
          details: {
            reasons: expect.arrayContaining([
              'Categoria aceita apenas a faixa blue',
              'Idade 14 abaixo do mínimo da categoria',
              'Peso 71.000kg acima do máximo da categoria',
            ]),
          },
        },
      },
    });
  });
});

function approvedWeighIn(
  competitionId: number,
  athleteId: number,
  measuredWeightGrams: number,
) {
  return WeighIn.restore({
    id: athleteId,
    competitionId,
    athleteId,
    measuredWeightGrams,
    status: WeighInStatus.APPROVED,
    performedAt: new Date('2026-01-10T10:00:00.000Z'),
    performedBy: 'mesa-1',
  });
}
