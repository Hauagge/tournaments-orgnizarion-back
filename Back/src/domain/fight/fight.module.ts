import { Module } from '@nestjs/common';
import { EventBusModule } from '@/core/events/event-bus.module';
import { CompetitionAccessGuard } from '@/core/auth/infra/guards/competition-access.guard';
import { AuthModule } from '../auth/auth.module';
import { AcademyProviderModule } from '../academy/academy-provider.module';
import { AreaProviderModule } from '../area/area-provider.module';
import { AthleteProviderModule } from '../athlete/athlete-provider.module';
import { CategoryProviderModule } from '../category/category-provider.module';
import { CompetitionProviderModule } from '../competition/competition-provider.module';
import { FinishFightUseCase } from './application/use-cases/finish-fight.use-case';
import { BestOfThreeProgressionService } from './application/services/best-of-three-progression.service';
import { CreateManualFightUseCase } from './application/use-cases/create-manual-fight.use-case';
import { DeleteFightUseCase } from './application/use-cases/delete-fight.use-case';
import { GenerateFightsUseCase } from './application/use-cases/generate-fights.use-case';
import { ListFightsUseCase } from './application/use-cases/list-fights.use-case';
import { MarkFightWinnerUseCase } from './application/use-cases/mark-fight-winner.use-case';
import { StartFightUseCase } from './application/use-cases/start-fight.use-case';
import { UpdateFightUseCase } from './application/use-cases/update-fight.use-case';
import { UpdateFightOrderUseCase } from './application/use-cases/update-fight-order.use-case';
import { FightController } from './infra/http/fight.controller';
import { FightGenerationStrategyModule } from './fight-generation-strategy.module';
import { FightProviderModule } from './fight-provider.module';

@Module({
  imports: [
    FightProviderModule,
    EventBusModule,
    AuthModule,
    AcademyProviderModule,
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
    UpdateFightOrderUseCase,
    CreateManualFightUseCase,
    MarkFightWinnerUseCase,
    UpdateFightUseCase,
    DeleteFightUseCase,
    BestOfThreeProgressionService,
    CompetitionAccessGuard,
  ],
  exports: [
    GenerateFightsUseCase,
    StartFightUseCase,
    FinishFightUseCase,
    ListFightsUseCase,
    UpdateFightOrderUseCase,
    CreateManualFightUseCase,
    MarkFightWinnerUseCase,
    UpdateFightUseCase,
    DeleteFightUseCase,
    BestOfThreeProgressionService,
  ],
})
export class FightModule {}
