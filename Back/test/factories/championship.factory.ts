import { Championship } from '../../src/domain/championship/entities/championship.entity';

export function makeChampionship(
  overrides: Partial<Championship> = {},
): Championship {
  return {
    id: 1,
    name: 'Championship Test',
    location: 'Sao Paulo',
    startDate: new Date('2026-01-10T00:00:00.000Z'),
    endDate: new Date('2026-01-11T00:00:00.000Z'),
    imageUrl: 'https://example.com/banner.png',
    description: 'Test championship',
    ...overrides,
  };
}

