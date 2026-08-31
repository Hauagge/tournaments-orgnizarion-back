import { Module } from '@nestjs/common';
import { CompetitionAccessGuard } from '@/core/auth/infra/guards/competition-access.guard';
import { AcademyProviderModule } from '../academy/academy-provider.module';
import { AthleteProviderModule } from '../athlete/athlete-provider.module';
import { AuthModule } from '../auth/auth.module';
import { CompetitionProviderModule } from '../competition/competition-provider.module';
import { WeighInProviderModule } from '../weighin/weighin-provider.module';
import { AddAthleteToCategoryUseCase } from './application/use-cases/add-athlete-to-category.use-case';
import { CreateCategoryUseCase } from './application/use-cases/create-category.use-case';
import { CategoryEligibilityService } from './application/services/category-eligibility.service';
import { DistributeAthletesUseCase } from './application/use-cases/distribute-athletes.use-case';
import { GetCategoryUseCase } from './application/use-cases/get-category.use-case';
import { GenerateCategoriesUseCase } from './application/use-cases/generate-categories.use-case';
import { ListCategoriesUseCase } from './application/use-cases/list-categories.use-case';
import { CategoryDistributionService } from './application/services/category-distribution.service';
import { CategoryGenerationService } from './application/services/category-generation.service';
import { CategoryGenerationStrategyResolverService } from './application/services/category-generation-strategy-resolver.service';
import { AbsoluteGpCategoryGenerationStrategy } from './application/strategies/absolute-gp-category-generation.strategy';
import { CbjjCategoryGenerationStrategy } from './application/strategies/cbjj-category-generation.strategy';
import { TeamCategoryGenerationStrategy } from './application/strategies/team-category-generation.strategy';
import { CategoryController } from './infra/http/category.controller';
import { CategoryProviderModule } from './category-provider.module';

@Module({
  imports: [
    CategoryProviderModule,
    CompetitionProviderModule,
    AthleteProviderModule,
    AcademyProviderModule,
    WeighInProviderModule,
    AuthModule,
  ],
  controllers: [CategoryController],
  providers: [
    AddAthleteToCategoryUseCase,
    CreateCategoryUseCase,
    GenerateCategoriesUseCase,
    DistributeAthletesUseCase,
    ListCategoriesUseCase,
    GetCategoryUseCase,
    CategoryGenerationService,
    CategoryGenerationStrategyResolverService,
    TeamCategoryGenerationStrategy,
    AbsoluteGpCategoryGenerationStrategy,
    CbjjCategoryGenerationStrategy,
    CategoryEligibilityService,
    CategoryDistributionService,
    CompetitionAccessGuard,
  ],
  exports: [
    GenerateCategoriesUseCase,
    DistributeAthletesUseCase,
    ListCategoriesUseCase,
    GetCategoryUseCase,
    CategoryProviderModule,
  ],
})
export class CategoryModule {}
