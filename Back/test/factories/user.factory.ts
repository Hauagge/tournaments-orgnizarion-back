import { AuthRole } from '../../src/domain/auth/auth-role.enum';
import { CompetitionAccessRole } from '../../src/domain/auth/competition-access-role.enum';
import { UserCompetitionTypeOrmEntity } from '../../src/domain/auth/entities/user-competition.typeorm-entity';
import { User } from '../../src/domain/auth/entities/user.typeorm-entity';

export function makeUser(
  overrides: Partial<User & { competitionLinks: UserCompetitionTypeOrmEntity[] }> = {},
): User {
  return {
    id: 1,
    username: 'staff',
    passwordHash: 'salt:hash',
    role: AuthRole.STAFF,
    academyId: null,
    competitionLinks: [],
    ...overrides,
  };
}

export function makeUserCompetitionLink(
  overrides: Partial<UserCompetitionTypeOrmEntity> = {},
): UserCompetitionTypeOrmEntity {
  return {
    userId: 1,
    competitionId: 1,
    role: CompetitionAccessRole.MEMBER,
    ...overrides,
  };
}
