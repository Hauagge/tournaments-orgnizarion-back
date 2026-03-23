import { Team } from '../domain/entities/team.entity';
import { TeamMember } from '../domain/entities/team-member.entity';

export abstract class ITeamRepository {
  abstract create(team: Team, athleteIds: number[]): Promise<Team>;
  abstract update(team: Team): Promise<Team>;
  abstract findById(id: number): Promise<Team | null>;
  abstract listByCompetitionId(competitionId: number): Promise<Team[]>;
  abstract countByCompetitionId(competitionId: number): Promise<number>;
  abstract listMembersByTeamId(teamId: number): Promise<TeamMember[]>;
  abstract findByCompetitionIdAndAthleteId(
    competitionId: number,
    athleteId: number,
  ): Promise<Team | null>;
  abstract addMember(teamId: number, athleteId: number): Promise<TeamMember>;
  abstract removeMember(teamId: number, athleteId: number): Promise<void>;
}
