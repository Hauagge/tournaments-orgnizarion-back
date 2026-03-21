import { Module } from '@nestjs/common';
import { AthleteProviderModule } from '../athlete/athlete-provider.module';
import { TeamProviderModule } from '../team/team-provider.module';
import { AthleteImportCsvService } from './application/services/athlete-import-csv.service';
import { CreateCompetitionUseCase } from './application/use-cases/create-competition.use-case';
import { GetCompetitionUseCase } from './application/use-cases/get-competition.use-case';
import { ImportAthletesUseCase } from './application/use-cases/import-athletes.use-case';
import { ListCompetitionsUseCase } from './application/use-cases/list-competitions.use-case';
import { PreviewAthleteImportUseCase } from './application/use-cases/preview-athlete-import.use-case';
import { UpdateCompetitionSettingsUseCase } from './application/use-cases/update-competition-settings.use-case';
import { CompetitionController } from './infra/http/competition.controller';
import { ICompetitionRepository } from './repository/ICompetitionRepository.repository';
import { CompetitionProviderModule } from './competition-provider.module';

@Module({
  imports: [
    CompetitionProviderModule,
    AthleteProviderModule,
    TeamProviderModule,
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
