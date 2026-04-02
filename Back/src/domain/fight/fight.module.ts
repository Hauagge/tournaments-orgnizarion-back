import { Module } from '@nestjs/common';
import { EventBusModule } from '@/core/events/event-bus.module';
import { AreaProviderModule } from '../area/area-provider.module';
import { AthleteProviderModule } from '../athlete/athlete-provider.module';
import { CategoryProviderModule } from '../category/category-provider.module';
import { CompetitionProviderModule } from '../competition/competition-provider.module';
import { FinishFightUseCase } from './application/use-cases/finish-fight.use-case';
import { GenerateFightsUseCase } from './application/use-cases/generate-fights.use-case';
import { ListFightsUseCase } from './application/use-cases/list-fights.use-case';
import { StartFightUseCase } from './application/use-cases/start-fight.use-case';
import { FightController } from './infra/http/fight.controller';
import { FightGenerationStrategyModule } from './fight-generation-strategy.module';
import { FightProviderModule } from './fight-provider.module';

@Module({
  imports: [
    FightProviderModule,
    EventBusModule,
    CompetitionProviderModule,
    CategoryProviderModule,
    AthleteProviderModule,
    AreaProviderModule,
    FightGenerationStrategyModule,
  ],
  controllers: [FightController],
  providers: [
    GenerateFightsUseCase,
    StartFightUseCase,
    FinishFightUseCase,
    ListFightsUseCase,
  ],
  exports: [GenerateFightsUseCase, StartFightUseCase, FinishFightUseCase, ListFightsUseCase],
})
export class FightModule {}
