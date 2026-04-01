import { Module } from '@nestjs/common';
import { AcademyProviderModule } from '../academy/academy-provider.module';
import { WeighInProviderModule } from '../weighin/weighin-provider.module';
import { CreateAthleteUseCase } from './application/use-cases/create-athlete.use-case';
import { GetAthleteUseCase } from './application/use-cases/get-athlete.use-case';
import { SearchAthletesUseCase } from './application/use-cases/search-athletes.use-case';
import { UpdateAthleteUseCase } from './application/use-cases/update-athlete.use-case';
import { AthleteController } from './infra/http/athlete.controller';
import { AthleteProviderModule } from './athlete-provider.module';

@Module({
  imports: [AthleteProviderModule, AcademyProviderModule, WeighInProviderModule],
  controllers: [AthleteController],
  providers: [
    CreateAthleteUseCase,
    UpdateAthleteUseCase,
    GetAthleteUseCase,
    SearchAthletesUseCase,
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
