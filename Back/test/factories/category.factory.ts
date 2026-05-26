import { Category } from '../../src/domain/category/domain/entities/category.entity';

export function makeCategory(
  overrides: Partial<ReturnType<Category['toJSON']>> = {},
): Category {
  return Category.restore({
    id: 1,
    competitionId: 1,
    name: 'Adulto Branco Leve',
    belt: 'white',
    allowMerge: false,
    mergeWithBelt: null,
    ageMin: 18,
    ageMax: 30,
    weightMinGrams: 60000,
    weightMaxGrams: 70000,
    totalAthletes: 0,
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
    ...overrides,
  });
}
