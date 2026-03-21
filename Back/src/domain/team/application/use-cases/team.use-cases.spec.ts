import { beforeEach, describe, expect, it } from 'vitest';
import {
  makeAthlete,
  makeCompetition,
  makeTeam,
} from '../../../../../test/factories';
import {
  InMemoryAthleteRepository,
  InMemoryCompetitionRepository,
  InMemoryTeamRepository,
} from '../../../../../test/repositories/in-memory';
import { ValidationError } from '@/shared/errors/validation.error';
import { AddAthleteToTeamUseCase } from './add-athlete-to-team.use-case';
import { CreateTeamUseCase } from './create-team.use-case';
import { ListTeamsByCompetitionUseCase } from './list-teams-by-competition.use-case';
import { RemoveAthleteFromTeamUseCase } from './remove-athlete-from-team.use-case';
import { UpdateTeamUseCase } from './update-team.use-case';

describe('Team use cases', () => {
  let competitionRepository: InMemoryCompetitionRepository;
  let teamRepository: InMemoryTeamRepository;
  let athleteRepository: InMemoryAthleteRepository;

  beforeEach(() => {
    competitionRepository = new InMemoryCompetitionRepository([
      makeCompetition({ id: 10 }),
      makeCompetition({ id: 20 }),
    ]);
    teamRepository = new InMemoryTeamRepository([
      makeTeam({ id: 1, competitionId: 10, name: 'Alpha Team' }),
      makeTeam({ id: 2, competitionId: 10, name: 'Bravo Team' }),
    ]);
    athleteRepository = new InMemoryAthleteRepository([
      makeAthlete({ id: 5, competitionId: 10, teamId: null }),
      makeAthlete({ id: 6, competitionId: 20, teamId: null }),
      makeAthlete({ id: 7, competitionId: 10, teamId: 1 }),
    ]);
  });

  it('should create a team for a competition', async () => {
    const useCase = new CreateTeamUseCase(
      competitionRepository,
      teamRepository,
    );

    const team = await useCase.execute({
      competitionId: 10,
      name: '  New Team  ',
    });

    expect(team.toJSON()).toEqual(
      expect.objectContaining({
        competitionId: 10,
        name: 'New Team',
      }),
    );
  });

  it('should update a team name', async () => {
    const useCase = new UpdateTeamUseCase(teamRepository);

    const team = await useCase.execute({
      id: 1,
      name: '  Renamed Team ',
    });

    expect(team.toJSON()).toEqual(
      expect.objectContaining({
        id: 1,
        name: 'Renamed Team',
      }),
    );
  });

  it('should list teams by competition sorted by name', async () => {
    const useCase = new ListTeamsByCompetitionUseCase(
      competitionRepository,
      teamRepository,
    );

    const teams = await useCase.execute({
      competitionId: 10,
    });

    expect(teams.map((team) => team.name)).toEqual([
      'Alpha Team',
      'Bravo Team',
    ]);
  });

  it('should add athlete to a team from the same competition', async () => {
    const useCase = new AddAthleteToTeamUseCase(
      teamRepository,
      athleteRepository,
    );

    const athlete = await useCase.execute({
      teamId: 1,
      athleteId: 5,
    });

    expect(athlete.teamId).toBe(1);
  });

  it('should not add athlete to a team from another competition', async () => {
    const useCase = new AddAthleteToTeamUseCase(
      teamRepository,
      athleteRepository,
    );

    await expect(
      useCase.execute({
        teamId: 1,
        athleteId: 6,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('should remove athlete from a team', async () => {
    const useCase = new RemoveAthleteFromTeamUseCase(
      teamRepository,
      athleteRepository,
    );

    const athlete = await useCase.execute({
      teamId: 1,
      athleteId: 7,
    });

    expect(athlete.teamId).toBeNull();
  });
});
