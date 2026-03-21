import { Module } from '@nestjs/common';
import { AthleteProviderModule } from '../athlete/athlete-provider.module';
import { CompetitionProviderModule } from '../competition/competition-provider.module';
import { AddAthleteToTeamUseCase } from './application/use-cases/add-athlete-to-team.use-case';
import { CreateTeamUseCase } from './application/use-cases/create-team.use-case';
import { ListTeamsByCompetitionUseCase } from './application/use-cases/list-teams-by-competition.use-case';
import { RemoveAthleteFromTeamUseCase } from './application/use-cases/remove-athlete-from-team.use-case';
import { UpdateTeamUseCase } from './application/use-cases/update-team.use-case';
import { TeamController } from './infra/http/team.controller';
import { ITeamRepository } from './repository/ITeamRepository.repository';
import { TeamProviderModule } from './team-provider.module';

@Module({
  imports: [
    TeamProviderModule,
    CompetitionProviderModule,
    AthleteProviderModule,
  ],
  controllers: [TeamController],
  providers: [
    CreateTeamUseCase,
    UpdateTeamUseCase,
    ListTeamsByCompetitionUseCase,
    AddAthleteToTeamUseCase,
    RemoveAthleteFromTeamUseCase,
  ],
  exports: [
    CreateTeamUseCase,
    UpdateTeamUseCase,
    ListTeamsByCompetitionUseCase,
    AddAthleteToTeamUseCase,
    RemoveAthleteFromTeamUseCase,
    TeamProviderModule,
  ],
})
export class TeamModule {}
