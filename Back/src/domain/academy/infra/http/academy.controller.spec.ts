import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeAthlete, makeAcademy } from '../../../../../test/factories';
import {
  InMemoryAcademyRepository,
  InMemoryAuthRepository,
} from '../../../../../test/repositories/in-memory';
import { CompetitionAccessGuard } from '@/core/auth/infra/guards/competition-access.guard';
import { CompetitionAccessRole } from '@/domain/auth/competition-access-role.enum';
import { LinkAthleteToAcademyUseCase } from '../../application/use-cases/link-athlete-to-academy.use-case';
import { CreateAcademyUseCase } from '../../application/use-cases/create-academy.use-case';
import { ListAcademiesByCompetitionUseCase } from '../../application/use-cases/list-academies-by-competition.use-case';
import { UnlinkAthleteFromAcademyUseCase } from '../../application/use-cases/unlink-athlete-from-academy.use-case';
import { UpdateAcademyUseCase } from '../../application/use-cases/update-academy.use-case';
import { AcademyController } from './academy.controller';

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

describe('AcademyController', () => {
  const createTeamUseCase = {
    execute: vi.fn(),
  } as unknown as CreateAcademyUseCase;
  const updateTeamUseCase = {
    execute: vi.fn(),
  } as unknown as UpdateAcademyUseCase;
  const listTeamsByCompetitionUseCase = {
    execute: vi.fn(),
  } as unknown as ListAcademiesByCompetitionUseCase;
  const addAthleteToTeamUseCase = {
    execute: vi.fn(),
  } as unknown as LinkAthleteToAcademyUseCase;
  const removeAthleteFromTeamUseCase = {
    execute: vi.fn(),
  } as unknown as UnlinkAthleteFromAcademyUseCase;

  const controller = new AcademyController(
    createTeamUseCase,
    updateTeamUseCase,
    listTeamsByCompetitionUseCase,
    addAthleteToTeamUseCase,
    removeAthleteFromTeamUseCase,
  );

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should create and return wrapped response', async () => {
    vi.mocked(createTeamUseCase.execute).mockResolvedValue(makeAcademy({ id: 1 }));

    const result = await controller.create({ id: 10 }, { name: 'Academy One' });

    expect(result).toEqual({
      data: makeAcademy({ id: 1 }).toJSON(),
      error: null,
    });
  });

  it('should list and return wrapped response', async () => {
    vi.mocked(listTeamsByCompetitionUseCase.execute).mockResolvedValue([
      makeAcademy({ id: 1 }),
      makeAcademy({ id: 2, name: 'Academy Two' }),
    ]);

    const result = await controller.listByCompetition({ id: 10 });

    expect(result).toEqual({
      data: [
        makeAcademy({ id: 1 }).toJSON(),
        makeAcademy({ id: 2, name: 'Academy Two' }).toJSON(),
      ],
      error: null,
    });
  });

  it('should update and return wrapped response', async () => {
    vi.mocked(updateTeamUseCase.execute).mockResolvedValue(
      makeAcademy({ id: 3, name: 'Updated Academy' }),
    );

    const result = await controller.update({ id: 3 }, { name: 'Updated Academy' });

    expect(result).toEqual({
      data: makeAcademy({ id: 3, name: 'Updated Academy' }).toJSON(),
      error: null,
    });
  });

  it('should add athlete and return wrapped response', async () => {
    vi.mocked(addAthleteToTeamUseCase.execute).mockResolvedValue(
      makeAthlete({ id: 9, academyId: 4 }),
    );

    const result = await controller.linkAthlete({ id: 4, athleteId: 9 });

    expect(result).toEqual({
      data: makeAthlete({ id: 9, academyId: 4 }).toJSON(),
      error: null,
    });
  });

  it('should remove athlete and return wrapped response', async () => {
    vi.mocked(removeAthleteFromTeamUseCase.execute).mockResolvedValue(
      makeAthlete({ id: 9, academyId: null }),
    );

    const result = await controller.unlinkAthlete({ id: 4, athleteId: 9 });

    expect(result).toEqual({
      data: makeAthlete({ id: 9, academyId: null }).toJSON(),
      error: null,
    });
  });
});

describe('AcademyController authorization (CompetitionAccessGuard)', () => {
  it('denies updating an academy that belongs to a competition the user has no access to', async () => {
    const userCompetitionRepository = new InMemoryAuthRepository();
    await userCompetitionRepository.grantAccess({
      userId: 1,
      competitionId: 1,
      role: CompetitionAccessRole.MEMBER,
    });

    const academyRepository = new InMemoryAcademyRepository([
      makeAcademy({ id: 4, competitionId: 99 }),
    ]);

    const guard = new CompetitionAccessGuard(
      new Reflector(),
      userCompetitionRepository,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      academyRepository,
    );

    const context = buildExecutionContext(
      AcademyController.prototype.update,
      AcademyController,
      { params: { id: '4' }, user: { sub: 1 } },
    );

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows updating an academy that belongs to a competition the user has access to', async () => {
    const userCompetitionRepository = new InMemoryAuthRepository();
    await userCompetitionRepository.grantAccess({
      userId: 1,
      competitionId: 99,
      role: CompetitionAccessRole.MEMBER,
    });

    const academyRepository = new InMemoryAcademyRepository([
      makeAcademy({ id: 4, competitionId: 99 }),
    ]);

    const guard = new CompetitionAccessGuard(
      new Reflector(),
      userCompetitionRepository,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      academyRepository,
    );

    const context = buildExecutionContext(
      AcademyController.prototype.update,
      AcademyController,
      { params: { id: '4' }, user: { sub: 1 } },
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
