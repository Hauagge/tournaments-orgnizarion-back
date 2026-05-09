import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { User } from './entities/user.typeorm-entity';
import { IUserRepository } from './repository/IUserRepository.repository';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async findByUsername(username: string) {
    return this.repository.findOne({
      where: { username },
      relations: {
        competitionLinks: true,
      },
    });
  }

  async findById(id: number) {
    return this.repository.findOne({
      where: { id },
      relations: {
        competitionLinks: true,
      },
    });
  }

  async list(input: { term?: string }): Promise<User[]> {
    const term = input.term?.trim();

    return this.repository.find({
      where: {
        ...(term ? { username: ILike(`%${term}%`) } : {}),
      },
      order: {
        username: 'ASC',
        id: 'ASC',
      },
    });
  }
}
