import { Injectable } from '@nestjs/common';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { ValidationError } from '@/shared/errors/validation.error';
import { KeysFightGenerationStrategy } from '@/domain/key-group/application/strategies/keys-fight-generation.strategy';
import { AbsoluteGpFightGenerationStrategy } from '../strategies/absolute-gp-fight-generation.strategy';
import { CbjjFightGenerationStrategy } from '../strategies/cbjj-fight-generation.strategy';
import { FightGenerationStrategy } from '../strategies/fight-generation.strategy';

@Injectable()
export class FightGenerationStrategyResolverService {
  private readonly strategies: FightGenerationStrategy<never>[];

  constructor(
    absoluteGpStrategy: AbsoluteGpFightGenerationStrategy,
    keysStrategy: KeysFightGenerationStrategy,
    cbjjStrategy: CbjjFightGenerationStrategy,
  ) {
    this.strategies = [
      absoluteGpStrategy,
      keysStrategy,
      cbjjStrategy,
    ] as unknown as FightGenerationStrategy<never>[];
  }

  resolve(mode: CompetitionMode): FightGenerationStrategy<unknown> {
    const strategy = this.strategies.find(
      (candidate) => candidate.mode === mode,
    );

    if (!strategy) {
      throw new ValidationError(`Unsupported fight generation mode: ${mode}`);
    }

    return strategy as unknown as FightGenerationStrategy<unknown>;
  }
}
