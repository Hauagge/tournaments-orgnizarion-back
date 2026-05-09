import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository } from '../../repository/IUserRepository.repository';

export type ListUsersInput = {
  term?: string;
};

export type ListUsersOutput = Array<{
  id: number;
  username: string;
  role: string;
  academyId: number | null;
}>;

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(IUserRepository)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(input: ListUsersInput): Promise<ListUsersOutput> {
    const users = await this.userRepository.list(input);

    return users.map((user) => ({
      id: user.id,
      username: user.username,
      role: user.role,
      academyId: user.academyId,
    }));
  }
}
