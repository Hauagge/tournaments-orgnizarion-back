import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreateCompetitionUseCase } from './application/use-cases/create-competition.use-case';
import { GetCompetitionUseCase } from './application/use-cases/get-competition.use-case';
import { ListCompetitionsUseCase } from './application/use-cases/list-competitions.use-case';
import { UpdateCompetitionSettingsUseCase } from './application/use-cases/update-competition-settings.use-case';
import { CompetitionController } from './infra/http/competition.controller';
import { CompetitionRepository } from './infra/persistence/competition.repository';
import { CompetitionTypeOrmEntity } from './infra/persistence/entities/competition.typeorm-entity';
import { ICompetitionRepository } from './repository/ICompetitionRepository.repository';

@Module({
  imports: [TypeOrmModule.forFeature([CompetitionTypeOrmEntity])],
  controllers: [CompetitionController],
  providers: [
    CreateCompetitionUseCase,
    UpdateCompetitionSettingsUseCase,
    GetCompetitionUseCase,
    ListCompetitionsUseCase,
    {
      provide: ICompetitionRepository,
      useClass: CompetitionRepository,
    },
  ],
  exports: [
    CreateCompetitionUseCase,
    UpdateCompetitionSettingsUseCase,
    GetCompetitionUseCase,
    ListCompetitionsUseCase,
    ICompetitionRepository,
  ],
})
export class CompetitionModule {}
