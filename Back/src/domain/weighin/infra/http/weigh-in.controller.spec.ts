import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CompetitionAccessGuard } from '@/core/auth/infra/guards/competition-access.guard';
import { AuthenticatedUser } from '@/core/auth/infra/types/authenticated-user.type';
import { AuthRole } from '@/domain/auth/auth-role.enum';
import { CompetitionAccessRole } from '@/domain/auth/competition-access-role.enum';
import { InMemoryAuthRepository } from '../../../../../test/repositories/in-memory/in-memory-auth.repository';
import { makeUser } from '../../../../../test/factories/user.factory';
import { ConfirmWeighInUseCase } from '../../application/use-cases/confirm-weigh-in.use-case';
import { GetWeighInStatusUseCase } from '../../application/use-cases/get-weigh-in-status.use-case';
import { ResetWeighInUseCase } from '../../application/use-cases/reset-weigh-in.use-case';
import { SearchWeighInByAthleteNameUseCase } from '../../application/use-cases/search-weigh-in-by-athlete-name.use-case';
import { WeighInStatus } from '../../domain/value-objects/weigh-in-status.enum';
import { WeighInController } from './weigh-in.controller';

const makeCurrentUser = (
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser => ({
  sub: 42,
  username: 'operador.mesa',
  role: AuthRole.DESK,
  academyId: null,
  competitionIds: [1],
  exp: Date.now() + 60_000,
  ...overrides,
});

describe('WeighInController', () => {
  const confirmWeighInUseCase = {
    execute: vi.fn(),
  } as unknown as ConfirmWeighInUseCase;
  const resetWeighInUseCase = {
    execute: vi.fn(),
  } as unknown as ResetWeighInUseCase;
  const getWeighInStatusUseCase = {
    execute: vi.fn(),
  } as unknown as GetWeighInStatusUseCase;
  const searchWeighInByAthleteNameUseCase = {
    execute: vi.fn(),
  } as unknown as SearchWeighInByAthleteNameUseCase;

  const controller = new WeighInController(
    confirmWeighInUseCase,
    resetWeighInUseCase,
    getWeighInStatusUseCase,
    searchWeighInByAthleteNameUseCase,
  );

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('confirm() should derive performedBy/performedById exclusively from the authenticated user', async () => {
    const weighInResult = { toJSON: () => ({ id: 1 }) };
    vi.mocked(confirmWeighInUseCase.execute).mockResolvedValue(
      weighInResult as never,
    );

    const currentUser = makeCurrentUser({ sub: 99, username: 'fulano' });

    await controller.confirm(
      { id: 10 },
      {
        athleteId: 7,
        realWeightGrams: 82000,
        weighInStatus: WeighInStatus.APPROVED,
        observation: null,
      },
      currentUser,
    );

    expect(confirmWeighInUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        performedById: 99,
        performedBy: 'fulano',
      }),
    );
  });

  it('confirm() has no header/param path to spoof the operator identity', () => {
    // The controller signature only accepts params, body and @CurrentUser().
    // There is no @Headers() decorator left on this method, so there is no
    // way to influence performedBy/performedById other than the JWT.
    expect(controller.confirm.length).toBe(3);
  });
});

describe('CompetitionAccessGuard protecting WeighInController', () => {
  const reflector = new Reflector();
  let userCompetitionRepository: InMemoryAuthRepository;
  let guard: CompetitionAccessGuard;

  beforeEach(() => {
    userCompetitionRepository = new InMemoryAuthRepository([
      makeUser({ id: 42, username: 'operador.mesa' }),
    ]);
    guard = new CompetitionAccessGuard(reflector, userCompetitionRepository);
  });

  const buildContext = (
    request: { params: Record<string, string>; user?: AuthenticatedUser },
  ): ExecutionContext =>
    ({
      getHandler: () => WeighInController.prototype.confirm,
      getClass: () => WeighInController,
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  it('blocks the request when there is no authenticated user', async () => {
    const context = buildContext({ params: { id: '1' }, user: undefined });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('blocks the request when the authenticated user has no link with the competition', async () => {
    const context = buildContext({
      params: { id: '1' },
      user: makeCurrentUser({ sub: 42 }),
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows the request when the authenticated user is linked to the competition', async () => {
    await userCompetitionRepository.grantAccess({
      userId: 42,
      competitionId: 1,
      role: CompetitionAccessRole.MEMBER,
    });

    const context = buildContext({
      params: { id: '1' },
      user: makeCurrentUser({ sub: 42 }),
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
