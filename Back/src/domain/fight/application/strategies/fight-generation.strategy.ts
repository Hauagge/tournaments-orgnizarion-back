import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { FightEntity } from '../../domain/entities/fight.entity';

export type FightGenerationMetadata = {
  categoryId: number | null;
  format: 'BEST_OF_THREE' | 'ROUND_ROBIN' | 'OLYMPIC_BRACKET';
  notes?: string[];
};

export type FightGenerationResult = {
  fights: FightEntity[];
  metadata: FightGenerationMetadata[];
};

export abstract class FightGenerationStrategy<Input = unknown> {
  abstract readonly mode: CompetitionMode;
  abstract generate(input: Input): FightGenerationResult;
}
