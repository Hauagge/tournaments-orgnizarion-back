import { Module } from '@nestjs/common';
import { CompetitionAccessGuard } from '@/core/auth/infra/guards/competition-access.guard';
import { AcademyProviderModule } from '../academy/academy-provider.module';
import { AthleteProviderModule } from '../athlete/athlete-provider.module';
import { AuthModule } from '../auth/auth.module';
import { CategoryProviderModule } from '../category/category-provider.module';
import { CompetitionProviderModule } from '../competition/competition-provider.module';
import { KeyGroupProviderModule } from '../key-group/key-group-provider.module';
import { ChampionAcademiesReportUseCase } from './application/use-cases/champion-academies-report.use-case';
import { ReportsController } from './infra/http/reports.controller';

@Module({
  imports: [
    AuthModule,
    CompetitionProviderModule,
    CategoryProviderModule,
    AthleteProviderModule,
    AcademyProviderModule,
    KeyGroupProviderModule,
  ],
  controllers: [ReportsController],
  providers: [ChampionAcademiesReportUseCase, CompetitionAccessGuard],
  exports: [ChampionAcademiesReportUseCase],
})
export class ReportsModule {}
