import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeAthlete } from '../../../../../test/factories';
import { CreateAthleteUseCase } from '../../application/use-cases/create-athlete.use-case';
import { SearchAthletesUseCase } from '../../application/use-cases/search-athletes.use-case';
import { UpdateAthleteUseCase } from '../../application/use-cases/update-athlete.use-case';
import { AthleteController } from './athlete.controller';

describe('AthleteController', () => {
  const createAthleteUseCase = {
    execute: vi.fn(),
  } as unknown as CreateAthleteUseCase;
  const updateAthleteUseCase = {
    execute: vi.fn(),
  } as unknown as UpdateAthleteUseCase;
  const searchAthletesUseCase = {
    execute: vi.fn(),
  } as unknown as SearchAthletesUseCase;

  const controller = new AthleteController(
    createAthleteUseCase,
    updateAthleteUseCase,
    searchAthletesUseCase,
  );

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should create and return wrapped response', async () => {
    vi.mocked(createAthleteUseCase.execute).mockResolvedValue(
      makeAthlete({ id: 1 }),
    );

    const result = await controller.create(
      { id: 10 },
      {
        fullName: 'Ana Silva',
        birthDate: new Date('2010-05-10T00:00:00.000Z'),
        belt: 'white',
        declaredWeightGrams: 50000,
        teamId: null,
      },
    );

    expect(result).toEqual({
      data: makeAthlete({ id: 1 }).toJSON(),
      error: null,
    });
  });

  it('should search and return wrapped response', async () => {
    vi.mocked(searchAthletesUseCase.execute).mockResolvedValue([
      makeAthlete({ id: 1 }),
      makeAthlete({ id: 2 }),
    ]);

    const result = await controller.search(
      { id: 10 },
      { query: 'ana', teamId: 3 },
    );

    expect(result).toEqual({
      data: [makeAthlete({ id: 1 }).toJSON(), makeAthlete({ id: 2 }).toJSON()],
      error: null,
    });
  });

  it('should update and return wrapped response', async () => {
    vi.mocked(updateAthleteUseCase.execute).mockResolvedValue(
      makeAthlete({ id: 5, fullName: 'Julia Costa' }),
    );

    const result = await controller.update(
      { id: 5 },
      { fullName: 'Julia Costa' },
    );

    expect(result).toEqual({
      data: makeAthlete({ id: 5, fullName: 'Julia Costa' }).toJSON(),
      error: null,
    });
  });
});
