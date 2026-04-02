import { Module } from '@nestjs/common';
import { AcademyProviderModule } from '../academy/academy-provider.module';
import { AthleteProviderModule } from '../athlete/athlete-provider.module';
import { AthleteImportCsvService } from './application/services/athlete-import-csv.service';
import { CompetitionTeamsHydratorService } from './application/services/competition-teams-hydrator.service';
import { CreateCompetitionUseCase } from './application/use-cases/create-competition.use-case';
import { GetCompetitionUseCase } from './application/use-cases/get-competition.use-case';
import { ImportAthletesUseCase } from './application/use-cases/import-athletes.use-case';
import { ListCompetitionsUseCase } from './application/use-cases/list-competitions.use-case';
import { PreviewAthleteImportUseCase } from './application/use-cases/preview-athlete-import.use-case';
import { UpdateCompetitionSettingsUseCase } from './application/use-cases/update-competition-settings.use-case';
import { CompetitionController } from './infra/http/competition.controller';
import { CompetitionProviderModule } from './competition-provider.module';

@Module({
  imports: [
    CompetitionProviderModule,
    AthleteProviderModule,
    AcademyProviderModule,
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
    CompetitionTeamsHydratorService,
  ],
  exports: [
    CreateCompetitionUseCase,
    UpdateCompetitionSettingsUseCase,
    GetCompetitionUseCase,
    ListCompetitionsUseCase,
    PreviewAthleteImportUseCase,
    ImportAthletesUseCase,
    CompetitionProviderModule,
  ],
})
export class CompetitionModule {}
