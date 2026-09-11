import { PaymentStatus } from '../../domain/value-objects/payment-status.enum';
import { WeighInStatus } from '@/domain/weighin/domain/value-objects/weigh-in-status.enum';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeAthlete } from '../../../../../test/factories';
import {
  InMemoryAthleteRepository,
  InMemoryAuthRepository,
} from '../../../../../test/repositories/in-memory';
import { CompetitionAccessGuard } from '@/core/auth/infra/guards/competition-access.guard';
import { CompetitionAccessRole } from '@/domain/auth/competition-access-role.enum';
import { CreateAthleteUseCase } from '../../application/use-cases/create-athlete.use-case';
import { SearchAthletesUseCase } from '../../application/use-cases/search-athletes.use-case';
import { UpdateAthleteUseCase } from '../../application/use-cases/update-athlete.use-case';
import { AthleteController } from './athlete.controller';

function buildExecutionContext(
  handler: (...args: unknown[]) => unknown,
  target: unknown,
  request: unknown,
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => target,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

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
        gender: null,
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

describe('AthleteController authorization (CompetitionAccessGuard)', () => {
  it('denies updating an athlete that belongs to a competition the user has no access to', async () => {
    const userCompetitionRepository = new InMemoryAuthRepository();
    await userCompetitionRepository.grantAccess({
      userId: 1,
      competitionId: 1,
      role: CompetitionAccessRole.MEMBER,
    });

    const athleteRepository = new InMemoryAthleteRepository([
      makeAthlete({ id: 5, competitionId: 99 }),
    ]);

    const guard = new CompetitionAccessGuard(
      new Reflector(),
      userCompetitionRepository,
      undefined,
      undefined,
      undefined,
      undefined,
      athleteRepository,
      undefined,
    );

    const context = buildExecutionContext(
      AthleteController.prototype.update,
      AthleteController,
      { params: { id: '5' }, user: { sub: 1 } },
    );

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows updating an athlete that belongs to a competition the user has access to', async () => {
    const userCompetitionRepository = new InMemoryAuthRepository();
    await userCompetitionRepository.grantAccess({
      userId: 1,
      competitionId: 99,
      role: CompetitionAccessRole.MEMBER,
    });

    const athleteRepository = new InMemoryAthleteRepository([
      makeAthlete({ id: 5, competitionId: 99 }),
    ]);

    const guard = new CompetitionAccessGuard(
      new Reflector(),
      userCompetitionRepository,
      undefined,
      undefined,
      undefined,
      undefined,
      athleteRepository,
      undefined,
    );

    const context = buildExecutionContext(
      AthleteController.prototype.update,
      AthleteController,
      { params: { id: '5' }, user: { sub: 1 } },
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
