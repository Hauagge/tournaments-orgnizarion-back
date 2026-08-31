import { Injectable } from '@nestjs/common';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { ValidationError } from '@/shared/errors/validation.error';
import { AbsoluteGpCategoryGenerationStrategy } from '../strategies/absolute-gp-category-generation.strategy';
import { CategoryGenerationStrategy } from '../strategies/category-generation.strategy';
import { CbjjCategoryGenerationStrategy } from '../strategies/cbjj-category-generation.strategy';
import { TeamCategoryGenerationStrategy } from '../strategies/team-category-generation.strategy';

@Injectable()
export class CategoryGenerationStrategyResolverService {
  private readonly strategies: CategoryGenerationStrategy[];

  constructor(
    teamStrategy: TeamCategoryGenerationStrategy,
    absoluteGpStrategy: AbsoluteGpCategoryGenerationStrategy,
    cbjjStrategy: CbjjCategoryGenerationStrategy,
  ) {
    this.strategies = [teamStrategy, absoluteGpStrategy, cbjjStrategy];
  }

  resolve(mode: CompetitionMode): CategoryGenerationStrategy {
    const strategy = this.strategies.find(
      (candidate) => candidate.mode === mode,
    );

    if (!strategy) {
      throw new ValidationError(
        `No category generation strategy configured for competition mode ${mode}`,
      );
    }

    return strategy;
  }
}
