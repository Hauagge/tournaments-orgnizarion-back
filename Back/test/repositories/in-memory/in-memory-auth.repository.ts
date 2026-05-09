import { User } from '../../../src/domain/auth/entities/user.typeorm-entity';
import { CompetitionAccessRole } from '../../../src/domain/auth/competition-access-role.enum';
import { UserCompetitionTypeOrmEntity } from '../../../src/domain/auth/entities/user-competition.typeorm-entity';
import { IUserCompetitionRepository } from '../../../src/domain/auth/repository/IUserCompetitionRepository.repository';
import { IUserRepository } from '../../../src/domain/auth/repository/IUserRepository.repository';

export class InMemoryAuthRepository
  implements IUserRepository, IUserCompetitionRepository
{
  private users: User[] = [];
  private userCompetitions: UserCompetitionTypeOrmEntity[] = [];

  constructor(seed: User[] = []) {
    this.users = [...seed];
    this.syncLinksFromUsers();
  }

  setUsers(users: User[]) {
    this.users = [...users];
    this.syncLinksFromUsers();
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.users.find((user) => user.username === username) ?? null;
  }

  async findById(id: number): Promise<User | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async create(user: User): Promise<User> {
    this.users.push(user);
    return user;
  }

  async findByUserIdAndCompetitionId(input: {
    userId: number;
    competitionId: number;
  }): Promise<UserCompetitionTypeOrmEntity | null> {
    return (
      this.userCompetitions.find(
        (link) =>
          link.userId === input.userId &&
          link.competitionId === input.competitionId,
      ) ?? null
    );
  }

  async grantAccess(input: {
    userId: number;
    competitionId: number;
    role: CompetitionAccessRole;
  }): Promise<void> {
    const existingIndex = this.userCompetitions.findIndex(
      (link) =>
        link.userId === input.userId &&
        link.competitionId === input.competitionId,
    );

    const link: UserCompetitionTypeOrmEntity = {
      userId: input.userId,
      competitionId: input.competitionId,
      role: input.role,
    };

    if (existingIndex >= 0) {
      this.userCompetitions[existingIndex] = link;
    } else {
      this.userCompetitions.push(link);
    }

    this.attachLinksToUsers();
  }

  async revokeAccess(input: {
    userId: number;
    competitionId: number;
  }): Promise<void> {
    this.userCompetitions = this.userCompetitions.filter(
      (link) =>
        !(
          link.userId === input.userId &&
          link.competitionId === input.competitionId
        ),
    );

    this.attachLinksToUsers();
  }

  private syncLinksFromUsers(): void {
    this.userCompetitions = this.users.flatMap((user) =>
      (user.competitionLinks ?? []).map((link) => ({
        ...link,
        userId: link.userId ?? (user.id as number),
      })),
    );

    this.attachLinksToUsers();
  }

  private attachLinksToUsers(): void {
    this.users = this.users.map((user) => ({
      ...user,
      competitionLinks: this.userCompetitions.filter(
        (link) => link.userId === user.id,
      ),
    }));
  }
}
