import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeAthlete, makeTeam } from '../../../../../test/factories';
import { LinkAthleteToAcademyUseCase } from '../../application/use-cases/add-athlete-to-academy.use-case';
import { CreateAcademyUseCase } from '../../application/use-cases/create-academy.use-case';
import { ListAcademiesByCompetitionUseCase } from '../../application/use-cases/list-academies-by-competition.use-case';
import { UnlinkAthleteFromAcademyUseCase } from '../../application/use-cases/remove-athlete-from-academy.use-case';
import { UpdateAcademyUseCase } from '../../application/use-cases/update-academy.use-case';
import { TeamController } from './academy.controller';

describe('TeamController', () => {
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

  const controller = new TeamController(
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
    vi.mocked(createTeamUseCase.execute).mockResolvedValue(makeTeam({ id: 1 }));

    const result = await controller.create({ id: 10 }, { name: 'Academy One' });

    expect(result).toEqual({
      data: makeTeam({ id: 1 }).toJSON(),
      error: null,
    });
  });

  it('should list and return wrapped response', async () => {
    vi.mocked(listTeamsByCompetitionUseCase.execute).mockResolvedValue([
      makeTeam({ id: 1 }),
      makeTeam({ id: 2, name: 'Academy Two' }),
    ]);

    const result = await controller.listByCompetition({ id: 10 });

    expect(result).toEqual({
      data: [
        makeTeam({ id: 1 }).toJSON(),
        makeTeam({ id: 2, name: 'Academy Two' }).toJSON(),
      ],
      error: null,
    });
  });

  it('should update and return wrapped response', async () => {
    vi.mocked(updateTeamUseCase.execute).mockResolvedValue(
      makeTeam({ id: 3, name: 'Updated Academy' }),
    );

    const result = await controller.update({ id: 3 }, { name: 'Updated Academy' });

    expect(result).toEqual({
      data: makeTeam({ id: 3, name: 'Updated Academy' }).toJSON(),
      error: null,
    });
  });

  it('should add athlete and return wrapped response', async () => {
    vi.mocked(addAthleteToTeamUseCase.execute).mockResolvedValue(
      makeAthlete({ id: 9, academyId: 4 }),
    );

    const result = await controller.addAthlete({ id: 4, athleteId: 9 });

    expect(result).toEqual({
      data: makeAthlete({ id: 9, academyId: 4 }).toJSON(),
      error: null,
    });
  });

  it('should remove athlete and return wrapped response', async () => {
    vi.mocked(removeAthleteFromTeamUseCase.execute).mockResolvedValue(
      makeAthlete({ id: 9, academyId: null }),
    );

    const result = await controller.removeAthlete({ id: 4, athleteId: 9 });

    expect(result).toEqual({
      data: makeAthlete({ id: 9, academyId: null }).toJSON(),
      error: null,
    });
  });
});
