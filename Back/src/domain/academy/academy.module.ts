import { Module } from '@nestjs/common';
import { AthleteProviderModule } from '../athlete/athlete-provider.module';
import { CompetitionProviderModule } from '../competition/competition-provider.module';
import { CreateAcademyUseCase } from './application/use-cases/create-academy.use-case';
import { LinkAthleteToAcademyUseCase } from './application/use-cases/link-athlete-to-academy.use-case';
import { ListAcademiesByCompetitionUseCase } from './application/use-cases/list-academies-by-competition.use-case';
import { UnlinkAthleteFromAcademyUseCase } from './application/use-cases/unlink-athlete-from-academy.use-case';
import { UpdateAcademyUseCase } from './application/use-cases/update-academy.use-case';
import { AcademyController } from './infra/http/academy.controller';
import { AcademyProviderModule } from './academy-provider.module';

@Module({
  imports: [
    AcademyProviderModule,
    CompetitionProviderModule,
    AthleteProviderModule,
  ],
  controllers: [AcademyController],
  providers: [
    CreateAcademyUseCase,
    UpdateAcademyUseCase,
    ListAcademiesByCompetitionUseCase,
    LinkAthleteToAcademyUseCase,
    UnlinkAthleteFromAcademyUseCase,
  ],
  exports: [
    CreateAcademyUseCase,
    UpdateAcademyUseCase,
    ListAcademiesByCompetitionUseCase,
    LinkAthleteToAcademyUseCase,
    UnlinkAthleteFromAcademyUseCase,
    AcademyProviderModule,
  ],
})
export class AcademyModule {}
