import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeAthlete, makeTeam } from '../../../../../test/factories';
import { AddAthleteToTeamUseCase } from '../../application/use-cases/add-athlete-to-team.use-case';
import { CreateTeamUseCase } from '../../application/use-cases/create-team.use-case';
import { ListTeamsByCompetitionUseCase } from '../../application/use-cases/list-teams-by-competition.use-case';
import { RemoveAthleteFromTeamUseCase } from '../../application/use-cases/remove-athlete-from-team.use-case';
import { UpdateTeamUseCase } from '../../application/use-cases/update-team.use-case';
import { TeamController } from './team.controller';

describe('TeamController', () => {
  const createTeamUseCase = {
    execute: vi.fn(),
  } as unknown as CreateTeamUseCase;
  const updateTeamUseCase = {
    execute: vi.fn(),
  } as unknown as UpdateTeamUseCase;
  const listTeamsByCompetitionUseCase = {
    execute: vi.fn(),
  } as unknown as ListTeamsByCompetitionUseCase;
  const addAthleteToTeamUseCase = {
    execute: vi.fn(),
  } as unknown as AddAthleteToTeamUseCase;
  const removeAthleteFromTeamUseCase = {
    execute: vi.fn(),
  } as unknown as RemoveAthleteFromTeamUseCase;

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

    const result = await controller.create({ id: 10 }, { name: 'Team One' });

    expect(result).toEqual({
      data: makeTeam({ id: 1 }).toJSON(),
      error: null,
    });
  });

  it('should list and return wrapped response', async () => {
    vi.mocked(listTeamsByCompetitionUseCase.execute).mockResolvedValue([
      makeTeam({ id: 1 }),
      makeTeam({ id: 2, name: 'Team Two' }),
    ]);

    const result = await controller.listByCompetition({ id: 10 });

    expect(result).toEqual({
      data: [
        makeTeam({ id: 1 }).toJSON(),
        makeTeam({ id: 2, name: 'Team Two' }).toJSON(),
      ],
      error: null,
    });
  });

  it('should update and return wrapped response', async () => {
    vi.mocked(updateTeamUseCase.execute).mockResolvedValue(
      makeTeam({ id: 3, name: 'Updated Team' }),
    );

    const result = await controller.update({ id: 3 }, { name: 'Updated Team' });

    expect(result).toEqual({
      data: makeTeam({ id: 3, name: 'Updated Team' }).toJSON(),
      error: null,
    });
  });

  it('should add athlete and return wrapped response', async () => {
    vi.mocked(addAthleteToTeamUseCase.execute).mockResolvedValue(
      makeAthlete({ id: 9, teamId: 4 }),
    );

    const result = await controller.addAthlete({ id: 4, athleteId: 9 });

    expect(result).toEqual({
      data: makeAthlete({ id: 9, teamId: 4 }).toJSON(),
      error: null,
    });
  });

  it('should remove athlete and return wrapped response', async () => {
    vi.mocked(removeAthleteFromTeamUseCase.execute).mockResolvedValue(
      makeAthlete({ id: 9, teamId: null }),
    );

    const result = await controller.removeAthlete({ id: 4, athleteId: 9 });

    expect(result).toEqual({
      data: makeAthlete({ id: 9, teamId: null }).toJSON(),
      error: null,
    });
  });
});
