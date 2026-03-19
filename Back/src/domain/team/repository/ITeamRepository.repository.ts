import { Team } from '../domain/entities/team.entity';

export abstract class ITeamRepository {
  abstract create(team: Team): Promise<Team>;
  abstract findByCompetitionIdAndName(
    competitionId: number,
    name: string,
  ): Promise<Team | null>;
  abstract findByCompetitionIdAndNames(
    competitionId: number,
    names: string[],
  ): Promise<Team[]>;
}
