import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AcademyProviderModule } from '../academy/academy-provider.module';
import { AthleteProviderModule } from '../athlete/athlete-provider.module';
import { CompetitionAccessService } from './application/services/competition-access.service';
import { AddUserToCompetitionUseCase } from './application/use-cases/add-user-to-competition.use-case';
import { AthleteImportCsvService } from './application/services/athlete-import-csv.service';
import { CompetitionTeamsHydratorService } from './application/services/competition-teams-hydrator.service';
import { CreateCompetitionUseCase } from './application/use-cases/create-competition.use-case';
import { GetCompetitionUseCase } from './application/use-cases/get-competition.use-case';
import { ImportAthletesUseCase } from './application/use-cases/import-athletes.use-case';
import { ListCompetitionUsersUseCase } from './application/use-cases/list-competition-users.use-case';
import { ListCompetitionsUseCase } from './application/use-cases/list-competitions.use-case';
import { PreviewAthleteImportUseCase } from './application/use-cases/preview-athlete-import.use-case';
import { RemoveUserFromCompetitionUseCase } from './application/use-cases/remove-user-from-competition.use-case';
import { UpdateCompetitionSettingsUseCase } from './application/use-cases/update-competition-settings.use-case';
import { CompetitionController } from './infra/http/competition.controller';
import { CompetitionProviderModule } from './competition-provider.module';

@Module({
  imports: [
    CompetitionProviderModule,
    AthleteProviderModule,
    AcademyProviderModule,
    AuthModule,
  ],
  controllers: [CompetitionController],
  providers: [
    CreateCompetitionUseCase,
    UpdateCompetitionSettingsUseCase,
    GetCompetitionUseCase,
    ListCompetitionUsersUseCase,
    ListCompetitionsUseCase,
    PreviewAthleteImportUseCase,
    ImportAthletesUseCase,
    AddUserToCompetitionUseCase,
    RemoveUserFromCompetitionUseCase,
    AthleteImportCsvService,
    CompetitionTeamsHydratorService,
    CompetitionAccessService,
  ],
  exports: [
    CreateCompetitionUseCase,
    UpdateCompetitionSettingsUseCase,
    GetCompetitionUseCase,
    ListCompetitionUsersUseCase,
    ListCompetitionsUseCase,
    PreviewAthleteImportUseCase,
    ImportAthletesUseCase,
    AddUserToCompetitionUseCase,
    RemoveUserFromCompetitionUseCase,
    CompetitionProviderModule,
  ],
})
export class CompetitionModule {}
