import { User } from '../entities/user.entity';

export abstract class IUserRepository {
  abstract findByUsername(username: string): Promise<User | null>;
}
