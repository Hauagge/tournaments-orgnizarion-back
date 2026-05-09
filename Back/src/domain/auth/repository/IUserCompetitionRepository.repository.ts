import { CompetitionAccessRole } from '../competition-access-role.enum';
import { UserCompetitionTypeOrmEntity } from '../entities/user-competition.typeorm-entity';

export abstract class IUserCompetitionRepository {
  abstract listByCompetitionId(input: {
    competitionId: number;
    search?: string;
  },
  ): Promise<UserCompetitionTypeOrmEntity[]>;

  abstract findByUserIdAndCompetitionId(input: {
    userId: number;
    competitionId: number;
  }): Promise<UserCompetitionTypeOrmEntity | null>;

  abstract grantAccess(input: {
    userId: number;
    competitionId: number;
    role: CompetitionAccessRole;
  }): Promise<void>;

  abstract revokeAccess(input: {
    userId: number;
    competitionId: number;
  }): Promise<void>;
}
