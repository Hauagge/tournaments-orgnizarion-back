import { WeighInStatus } from '@/domain/weighin/domain/value-objects/weigh-in-status.enum';
import { Team } from '../domain/entities/team.entity';
import { TeamMember } from '../domain/entities/team-member.entity';

export type TeamCompetitionRosterAthlete = {
  id: number;
  fullName: string;
  belt: string;
  declaredWeightGrams: number;
  academyName: string | null;
  weighInStatus: WeighInStatus;
};

export type TeamCompetitionRosterItem = {
  id: number;
  name: string;
  athletes: TeamCompetitionRosterAthlete[];
};

export abstract class ITeamRepository {
  abstract create(team: Team, athleteIds: number[]): Promise<Team>;
  abstract update(team: Team): Promise<Team>;
  abstract findById(id: number): Promise<Team | null>;
  abstract listByCompetitionId(
    competitionId: number,
    includes?: string[],
  ): Promise<Team[]>;
  abstract listRosterByCompetitionId(
    competitionId: number,
  ): Promise<TeamCompetitionRosterItem[]>;
  abstract countByCompetitionId(competitionId: number): Promise<number>;
  abstract listMembersByTeamId(teamId: number): Promise<TeamMember[]>;
  abstract findByCompetitionIdAndAthleteId(
    competitionId: number,
    athleteId: number,
  ): Promise<Team | null>;
  abstract addMember(teamId: number, athleteId: number): Promise<TeamMember>;
  abstract removeMember(teamId: number, athleteId: number): Promise<void>;
}
