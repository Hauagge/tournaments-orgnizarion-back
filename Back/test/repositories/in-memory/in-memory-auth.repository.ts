import { User } from '../../../src/domain/auth/entities/user.entity';
import { IUserRepository } from '../../../src/domain/auth/repository/IUserRepository.repository';

export class InMemoryAuthRepository implements IUserRepository {
  private users: User[] = [];

  constructor(seed: User[] = []) {
    this.users = [...seed];
  }

  setUsers(users: User[]) {
    this.users = [...users];
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.users.find((user) => user.username === username) ?? null;
  }

  async create(user: User): Promise<User> {
    this.users.push(user);
    return user;
  }
}
