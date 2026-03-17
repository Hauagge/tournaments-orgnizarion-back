import { User } from '../entities/user.typeorm-entity';

export abstract class IUserRepository {
  abstract findByUsername(username: string): Promise<User | null>;
}
