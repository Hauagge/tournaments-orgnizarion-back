import { PaymentStatus } from '../../domain/value-objects/payment-status.enum';
import { WeighInStatus } from '@/domain/weighin/domain/value-objects/weigh-in-status.enum';
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
        declaredWeight: 50000,
        documentNumber: null,
        paymentStatus: PaymentStatus.PENDING,
        weighInStatus: WeighInStatus.APPROVED,
        academyId: null,
      },
    );

    expect(result).toEqual({
      data: makeAthlete({ id: 1 }).toJSON(),
      error: null,
    });
  });

  it('should search and return wrapped response', async () => {
    vi.mocked(searchAthletesUseCase.execute).mockResolvedValue([
      {
        ...makeAthlete({ id: 1 }).toJSON(),
        academyName: 'Academy A',
        weighInStatus: WeighInStatus.PENDING,
        weighInMeasuredWeightGrams: null,
        weighInEvaluatedById: null,
        weighInEvaluatedByName: null,
        weighInEvaluatedAt: null,
        weighInObservation: null,
      },
      {
        ...makeAthlete({ id: 2 }).toJSON(),
        academyName: 'Academy B',
        weighInStatus: WeighInStatus.APPROVED,
        weighInMeasuredWeightGrams: 82500,
        weighInEvaluatedById: null,
        weighInEvaluatedByName: null,
        weighInEvaluatedAt: null,
        weighInObservation: null,
      },
    ]);

    const result = await controller.search(
      { id: 10 },
      { query: 'ana', academyId: 3 },
    );

    expect(result).toEqual({
      data: [
        {
          ...makeAthlete({ id: 1 }).toJSON(),
          academyName: 'Academy A',
          weighInStatus: WeighInStatus.PENDING,
          weighInMeasuredWeightGrams: null,
          weighInEvaluatedById: null,
          weighInEvaluatedByName: null,
          weighInEvaluatedAt: null,
          weighInObservation: null,
        },
        {
          ...makeAthlete({ id: 2 }).toJSON(),
          academyName: 'Academy B',
          weighInStatus: WeighInStatus.APPROVED,
          weighInMeasuredWeightGrams: 82500,
          weighInEvaluatedById: null,
          weighInEvaluatedByName: null,
          weighInEvaluatedAt: null,
          weighInObservation: null,
        },
      ],
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
