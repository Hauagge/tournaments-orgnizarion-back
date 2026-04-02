import { Injectable } from '@nestjs/common';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { ValidationError } from '@/shared/errors/validation.error';
import { KeysFightGenerationStrategy } from '@/domain/key-group/application/strategies/keys-fight-generation.strategy';
import { AbsoluteGpFightGenerationStrategy } from '../strategies/absolute-gp-fight-generation.strategy';
import { FightGenerationStrategy } from '../strategies/fight-generation.strategy';

@Injectable()
export class FightGenerationStrategyResolverService {
  constructor(
    private readonly absoluteGpStrategy: AbsoluteGpFightGenerationStrategy,
    private readonly keysStrategy: KeysFightGenerationStrategy,
  ) {}

  resolve(mode: CompetitionMode): FightGenerationStrategy<unknown> {
    if (mode === this.absoluteGpStrategy.mode) {
      return this.absoluteGpStrategy;
    }

    if (mode === this.keysStrategy.mode) {
      return this.keysStrategy;
    }

    throw new ValidationError(`Unsupported fight generation mode: ${mode}`);
  }
}
