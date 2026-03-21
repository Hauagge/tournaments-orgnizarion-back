import { Team } from '../domain/entities/team.entity';

export abstract class ITeamRepository {
  abstract create(team: Team): Promise<Team>;
  abstract update(team: Team): Promise<Team>;
  abstract findById(id: number): Promise<Team | null>;
  abstract findByCompetitionIdAndName(
    competitionId: number,
    name: string,
  ): Promise<Team | null>;
  abstract findByCompetitionIdAndNames(
    competitionId: number,
    names: string[],
  ): Promise<Team[]>;
  abstract listByCompetitionId(competitionId: number): Promise<Team[]>;
}
