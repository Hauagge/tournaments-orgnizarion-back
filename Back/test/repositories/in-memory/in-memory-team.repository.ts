import { Team } from '../../../src/domain/team/domain/entities/team.entity';
import { ITeamRepository } from '../../../src/domain/team/repository/ITeamRepository.repository';
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
}
