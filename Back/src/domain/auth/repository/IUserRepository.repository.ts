import { User } from '../entities/user.typeorm-entity';

export abstract class IUserRepository {
  abstract findByUsername(username: string): Promise<User | null>;
  abstract findById(id: number): Promise<User | null>;
  abstract list(input: { term?: string }): Promise<User[]>;
}
