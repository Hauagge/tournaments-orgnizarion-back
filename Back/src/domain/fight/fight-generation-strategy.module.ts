import { Module } from '@nestjs/common';
import { FourAthleteOlympicBracketFightGenerationStrategy } from '@/domain/key-group/application/strategies/four-athlete-olympic-bracket-fight-generation.strategy';
import { KeysFightGenerationStrategy } from '@/domain/key-group/application/strategies/keys-fight-generation.strategy';
import { FightGenerationStrategyResolverService } from './application/services/fight-generation-strategy-resolver.service';
import { AbsoluteGpFightGenerationStrategy } from './application/strategies/absolute-gp-fight-generation.strategy';

@Module({
  providers: [
    AbsoluteGpFightGenerationStrategy,
    FourAthleteOlympicBracketFightGenerationStrategy,
    KeysFightGenerationStrategy,
    FightGenerationStrategyResolverService,
  ],
  exports: [
    AbsoluteGpFightGenerationStrategy,
    FourAthleteOlympicBracketFightGenerationStrategy,
    KeysFightGenerationStrategy,
    FightGenerationStrategyResolverService,
  ],
})
export class FightGenerationStrategyModule {}
