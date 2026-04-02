import { Module } from '@nestjs/common';
import { EventBusModule } from '@/core/events/event-bus.module';
import { AthleteProviderModule } from '../athlete/athlete-provider.module';
import { CompetitionProviderModule } from '../competition/competition-provider.module';
import { FightProviderModule } from '../fight/fight-provider.module';
import { CallNextAreaFightUseCase } from './application/use-cases/call-next-area-fight.use-case';
import { CreateAreasUseCase } from './application/use-cases/create-areas.use-case';
import { DistributeAreaFightsUseCase } from './application/use-cases/distribute-area-fights.use-case';
import { GetAreaQueueUseCase } from './application/use-cases/get-area-queue.use-case';
import { ListAreasByCompetitionUseCase } from './application/use-cases/list-areas-by-competition.use-case';
import { RestPolicyService } from './application/services/rest-policy.service';
import { AreaDistributionStrategy } from './application/strategies/area-distribution.strategy';
import { SplitByAgeStrategy } from './application/strategies/split-by-age.strategy';
import { AreaController } from './infra/http/area.controller';
import { AreaProviderModule } from './area-provider.module';

@Module({
  imports: [
    AreaProviderModule,
    CompetitionProviderModule,
    FightProviderModule,
    AthleteProviderModule,
    EventBusModule,
  ],
  controllers: [AreaController],
  providers: [
    CreateAreasUseCase,
    ListAreasByCompetitionUseCase,
    DistributeAreaFightsUseCase,
    GetAreaQueueUseCase,
    CallNextAreaFightUseCase,
    RestPolicyService,
    SplitByAgeStrategy,
    {
      provide: AreaDistributionStrategy,
      useExisting: SplitByAgeStrategy,
    },
  ],
  exports: [
    CreateAreasUseCase,
    ListAreasByCompetitionUseCase,
    DistributeAreaFightsUseCase,
    GetAreaQueueUseCase,
    CallNextAreaFightUseCase,
    AreaProviderModule,
  ],
})
export class AreaModule {}
