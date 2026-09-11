import { Module } from '@nestjs/common';
import { CompetitionAccessGuard } from '@/core/auth/infra/guards/competition-access.guard';
import { AuthModule } from '../auth/auth.module';
import { AthleteProviderModule } from '../athlete/athlete-provider.module';
import { CompetitionProviderModule } from '../competition/competition-provider.module';
import { ConfirmWeighInUseCase } from './application/use-cases/confirm-weigh-in.use-case';
import { GetWeighInStatusUseCase } from './application/use-cases/get-weigh-in-status.use-case';
import { ResetWeighInUseCase } from './application/use-cases/reset-weigh-in.use-case';
import { SearchWeighInByAthleteNameUseCase } from './application/use-cases/search-weigh-in-by-athlete-name.use-case';
import { WeighInController } from './infra/http/weigh-in.controller';
import { WeighInProviderModule } from './weighin-provider.module';

@Module({
  imports: [
    WeighInProviderModule,
    CompetitionProviderModule,
    AthleteProviderModule,
    AuthModule,
  ],
  controllers: [WeighInController],
  providers: [
    ConfirmWeighInUseCase,
    ResetWeighInUseCase,
    GetWeighInStatusUseCase,
    SearchWeighInByAthleteNameUseCase,
    CompetitionAccessGuard,
  ],
  exports: [
    ConfirmWeighInUseCase,
    ResetWeighInUseCase,
    GetWeighInStatusUseCase,
    SearchWeighInByAthleteNameUseCase,
    WeighInProviderModule,
  ],
})
export class WeighInModule {}
