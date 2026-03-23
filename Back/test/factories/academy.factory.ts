import { Academy } from '../../src/domain/academy/domain/entities/academy.entity';

export function makeAcademy(
  overrides: Partial<ReturnType<Academy['toJSON']>> = {},
): Academy {
  return Academy.restore({
    id: 1,
    competitionId: 1,
    name: 'Academy Test',
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
    ...overrides,
  });
}
