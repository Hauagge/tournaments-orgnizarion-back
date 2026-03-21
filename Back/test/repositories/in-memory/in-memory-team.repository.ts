import { Team } from '../../../src/domain/team/domain/entities/team.entity';
import { ITeamRepository } from '../../../src/domain/team/repository/ITeamRepository.repository';
import { NotFoundError } from '../../../src/shared/errors/not-found.error';
import { makeTeam } from '../../factories';

export class InMemoryTeamRepository implements ITeamRepository {
  private teams: Team[] = [];
  private nextId = 1;

  constructor(seed: Team[] = []) {
    this.teams = [...seed];
    this.nextId = seed.reduce((max, item) => Math.max(max, item.id ?? 0), 0) + 1;
  }

  async create(team: Team): Promise<Team> {
    const createdTeam = makeTeam({
      ...team.toJSON(),
      id: this.nextId++,
    });
    this.teams.push(createdTeam);
    return createdTeam;
  }

  async update(team: Team): Promise<Team> {
    const index = this.teams.findIndex((item) => item.id === team.id);

    if (index < 0) {
      throw new NotFoundError(`Team with id ${team.id as number} not found`);
    }

    this.teams[index] = team;
    return team;
  }

  async findById(id: number): Promise<Team | null> {
    return this.teams.find((team) => team.id === id) ?? null;
  }

  async findByCompetitionIdAndName(
    competitionId: number,
    name: string,
  ): Promise<Team | null> {
    const normalizedName = Team.normalizeName(name);

    return (
      this.teams.find(
        (team) =>
          team.competitionId === competitionId && team.name === normalizedName,
      ) ?? null
    );
  }

  async findByCompetitionIdAndNames(
    competitionId: number,
    names: string[],
  ): Promise<Team[]> {
    const normalizedNames = new Set(names.map((name) => Team.normalizeName(name)));

    if (normalizedNames.size === 0) {
      return [];
    }

    return this.teams.filter(
      (team) =>
        team.competitionId === competitionId && normalizedNames.has(team.name),
    );
  }

  async listByCompetitionId(competitionId: number): Promise<Team[]> {
    return this.teams
      .filter((team) => team.competitionId === competitionId)
      .sort((left, right) => left.name.localeCompare(right.name));
  }
}
