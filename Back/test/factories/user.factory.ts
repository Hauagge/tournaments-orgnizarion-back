import { AuthRole } from '../../src/domain/auth/auth-role.enum';
import { User } from '../../src/domain/auth/entities/user.typeorm-entity';

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    username: 'staff',
    passwordHash: 'salt:hash',
    role: AuthRole.STAFF,
    ...overrides,
  };
}
