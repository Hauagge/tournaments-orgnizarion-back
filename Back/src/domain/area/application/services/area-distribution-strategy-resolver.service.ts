import { Injectable } from '@nestjs/common';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { ValidationError } from '@/shared/errors/validation.error';
import { AreaDistributionStrategy } from '../strategies/area-distribution.strategy';
import { KeysAreaDistributionStrategy } from '../strategies/keys-area-distribution.strategy';
import { SplitByAgeStrategy } from '../strategies/split-by-age.strategy';

@Injectable()
export class AreaDistributionStrategyResolverService {
  private readonly strategies: AreaDistributionStrategy[];

  constructor(
    splitByAgeStrategy: SplitByAgeStrategy,
    keysAreaDistributionStrategy: KeysAreaDistributionStrategy,
  ) {
    this.strategies = [splitByAgeStrategy, keysAreaDistributionStrategy];
  }

  resolve(mode: CompetitionMode): AreaDistributionStrategy {
    const strategy = this.strategies.find((candidate) => candidate.mode === mode);

    if (!strategy) {
      throw new ValidationError(
        `No area distribution strategy configured for competition mode ${mode}`,
      );
    }

    return strategy;
  }
}
