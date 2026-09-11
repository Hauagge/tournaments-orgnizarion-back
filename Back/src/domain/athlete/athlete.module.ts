import { Module } from '@nestjs/common';
import { CompetitionAccessGuard } from '@/core/auth/infra/guards/competition-access.guard';
import { AuthModule } from '../auth/auth.module';
import { AcademyProviderModule } from '../academy/academy-provider.module';
import { WeighInProviderModule } from '../weighin/weighin-provider.module';
import { CreateAthleteUseCase } from './application/use-cases/create-athlete.use-case';
import { GetAthleteUseCase } from './application/use-cases/get-athlete.use-case';
import { SearchAthletesUseCase } from './application/use-cases/search-athletes.use-case';
import { UpdateAthleteUseCase } from './application/use-cases/update-athlete.use-case';
import { AthleteController } from './infra/http/athlete.controller';
import { AthleteProviderModule } from './athlete-provider.module';

@Module({
  imports: [
    AthleteProviderModule,
    AcademyProviderModule,
    WeighInProviderModule,
    AuthModule,
  ],
  controllers: [AthleteController],
  providers: [
    CreateAthleteUseCase,
    UpdateAthleteUseCase,
    GetAthleteUseCase,
    SearchAthletesUseCase,
    CompetitionAccessGuard,
  ],
  exports: [
    CreateAthleteUseCase,
    UpdateAthleteUseCase,
    GetAthleteUseCase,
    SearchAthletesUseCase,
    AthleteProviderModule,
  ],
})
export class AthleteModule {}
