import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { CompetitionAccessRole } from './competition-access-role.enum';
import { UserCompetitionTypeOrmEntity } from './entities/user-competition.typeorm-entity';
import { IUserCompetitionRepository } from './repository/IUserCompetitionRepository.repository';

@Injectable()
export class UserCompetitionRepository implements IUserCompetitionRepository {
  constructor(
    @InjectRepository(UserCompetitionTypeOrmEntity)
    private readonly repository: Repository<UserCompetitionTypeOrmEntity>,
  ) {}

  async listByCompetitionId(input: {
    competitionId: number;
    search?: string;
  }): Promise<UserCompetitionTypeOrmEntity[]> {
    const search = input.search?.trim();

    return this.repository.find({
      where: {
        competitionId: input.competitionId,
        ...(search
          ? {
              user: {
                username: ILike(`%${search}%`),
              },
            }
          : {}),
      },
      relations: {
        user: true,
      },
      order: {
        userId: 'ASC',
      },
    });
  }

  async findByUserIdAndCompetitionId(input: {
    userId: number;
    competitionId: number;
  }): Promise<UserCompetitionTypeOrmEntity | null> {
    return this.repository.findOne({
      where: {
        userId: input.userId,
        competitionId: input.competitionId,
      },
    });
  }

  async grantAccess(input: {
    userId: number;
    competitionId: number;
    role: CompetitionAccessRole;
  }): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .insert()
      .into(UserCompetitionTypeOrmEntity)
      .values({
        userId: input.userId,
        competitionId: input.competitionId,
        role: input.role,
      })
      .orUpdate(['role'], ['user_id', 'competition_id'])
      .execute();
  }

  async revokeAccess(input: {
    userId: number;
    competitionId: number;
  }): Promise<void> {
    await this.repository.delete({
      userId: input.userId,
      competitionId: input.competitionId,
    });
  }
}
