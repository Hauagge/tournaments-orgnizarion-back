import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CompetitionAccessRole } from '@/domain/auth/competition-access-role.enum';
import { UserCompetitionTypeOrmEntity } from '@/domain/auth/entities/user-competition.typeorm-entity';
import { Competition } from '../../domain/entities/competition.entity';
import { CompetitionMode } from '../../domain/value-objects/competition-mode.enum';
import { CompetitionTypeOrmEntity } from '../../infra/persistence/entities/competition.typeorm-entity';
import { CompetitionMapper } from '../../infra/persistence/mappers/competition.mapper';
import { Logger } from '@/configuration/logger.configuration';

export type CreateCompetitionInput = {
  currentUserId: number;
  name: string;
  mode: CompetitionMode;
  fightDurationSeconds: number;
  weighInMarginGrams: number;
  ageSplitYears: number;
};

@Injectable()
export class CreateCompetitionUseCase {
  private readonly logger = new Logger(CreateCompetitionUseCase.name);
  constructor(private readonly dataSource: DataSource) {}

  async execute(input: CreateCompetitionInput): Promise<Competition> {
    const competition = Competition.create({
      name: input.name,
      mode: input.mode,
      fightDurationSeconds: input.fightDurationSeconds,
      weighInMarginGrams: input.weighInMarginGrams,
      ageSplitYears: input.ageSplitYears,
    });

    const savedEntity = await this.dataSource.transaction(async (manager) => {
      const competitionRepository = manager.getRepository(CompetitionTypeOrmEntity);
      const userCompetitionRepository = manager.getRepository(UserCompetitionTypeOrmEntity);

      const entity = competitionRepository.create(
        CompetitionMapper.toPersistence(competition),
      );
      const created = await competitionRepository.save(entity);

      await userCompetitionRepository
        .createQueryBuilder()
        .insert()
        .into(UserCompetitionTypeOrmEntity)
        .values({
          userId: input.currentUserId,
          competitionId: created.id,
          role: CompetitionAccessRole.OWNER,
        })
        .orUpdate(['role'], ['user_id', 'competition_id'])
        .execute();

      return created;
    });

    return CompetitionMapper.toDomain(savedEntity);
  }
}
