import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AthleteModule } from '../athlete/athlete.module';
import { TeamModule } from '../team/team.module';
import { CreateCompetitionUseCase } from './application/use-cases/create-competition.use-case';
import { GetCompetitionUseCase } from './application/use-cases/get-competition.use-case';
import { ImportAthletesUseCase } from './application/use-cases/import-athletes.use-case';
import { ListCompetitionsUseCase } from './application/use-cases/list-competitions.use-case';
import { PreviewAthleteImportUseCase } from './application/use-cases/preview-athlete-import.use-case';
import { AthleteImportCsvService } from './application/services/athlete-import-csv.service';
import { UpdateCompetitionSettingsUseCase } from './application/use-cases/update-competition-settings.use-case';
import { CompetitionController } from './infra/http/competition.controller';
import { CompetitionRepository } from './infra/persistence/competition.repository';
import { CompetitionTypeOrmEntity } from './infra/persistence/entities/competition.typeorm-entity';
import { ICompetitionRepository } from './repository/ICompetitionRepository.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([CompetitionTypeOrmEntity]),
    AthleteModule,
    TeamModule,
  ],
  controllers: [CompetitionController],
  providers: [
    CreateCompetitionUseCase,
    UpdateCompetitionSettingsUseCase,
    GetCompetitionUseCase,
    ListCompetitionsUseCase,
    PreviewAthleteImportUseCase,
    ImportAthletesUseCase,
    AthleteImportCsvService,
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
    PreviewAthleteImportUseCase,
    ImportAthletesUseCase,
    ICompetitionRepository,
  ],
})
export class CompetitionModule {}
