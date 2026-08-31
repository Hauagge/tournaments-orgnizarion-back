import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { FightEntity } from '../../domain/entities/fight.entity';

export type FightGenerationMetadata = {
  categoryId: number | null;
  format:
    | 'BEST_OF_THREE'
    | 'ROUND_ROBIN'
    | 'OLYMPIC'
    | 'OLYMPIC_WITH_BRONZE'
    | 'THREE_ATHLETE_PLAYOFF'
    | 'GOLD_SILVER_SERIES';
  notes?: string[];
};

/**
 * Ligacao entre lutas geradas, por indice dentro de `fights` (os ids so existem
 * depois de persistir). `winner`/`loser` dizem para onde vai cada atleta.
 */
export type FightGenerationLink = {
  fromIndex: number;
  winner?: { toIndex: number; slot: 'A' | 'B' };
  loser?: { toIndex: number; slot: 'A' | 'B' };
};

export type FightGenerationResult = {
  fights: FightEntity[];
  metadata: FightGenerationMetadata[];
  /** Quando presente, substitui o encadeamento padrao de bracket. */
  links?: FightGenerationLink[];
};

export abstract class FightGenerationStrategy<Input = unknown> {
  abstract readonly mode: CompetitionMode;
  abstract generate(input: Input): FightGenerationResult;
}
