import { Injectable } from '@nestjs/common';
import { Athlete } from '@/domain/athlete/domain/entities/athlete.entity';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { GeneratedCategory } from '../strategies/category-generation.strategy';
import { CategoryGenerationStrategyResolverService } from './category-generation-strategy-resolver.service';

@Injectable()
export class CategoryGenerationService {
  constructor(
    private readonly strategyResolver: CategoryGenerationStrategyResolverService,
  ) {}

  generate(
    competitionId: number,
    mode: CompetitionMode,
    athletes: Athlete[],
  ): GeneratedCategory[] {
    return this.strategyResolver.resolve(mode).generate(competitionId, athletes);
  }
}
