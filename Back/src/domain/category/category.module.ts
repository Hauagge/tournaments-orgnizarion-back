import { Module } from '@nestjs/common';
import { AthleteProviderModule } from '../athlete/athlete-provider.module';
import { CompetitionProviderModule } from '../competition/competition-provider.module';
import { TeamProviderModule } from '../team/team-provider.module';
import { WeighInProviderModule } from '../weighin/weighin-provider.module';
import { GetCategoryUseCase } from './application/use-cases/get-category.use-case';
import { GenerateCategoriesUseCase } from './application/use-cases/generate-categories.use-case';
import { ListCategoriesUseCase } from './application/use-cases/list-categories.use-case';
import { CategoryGenerationService } from './application/services/category-generation.service';
import { CategoryController } from './infra/http/category.controller';
import { CategoryProviderModule } from './category-provider.module';

@Module({
  imports: [
    CategoryProviderModule,
    CompetitionProviderModule,
    AthleteProviderModule,
    TeamProviderModule,
    WeighInProviderModule,
  ],
  controllers: [CategoryController],
  providers: [
    GenerateCategoriesUseCase,
    ListCategoriesUseCase,
    GetCategoryUseCase,
    CategoryGenerationService,
  ],
  exports: [
    GenerateCategoriesUseCase,
    ListCategoriesUseCase,
    GetCategoryUseCase,
    CategoryProviderModule,
  ],
})
export class CategoryModule {}
