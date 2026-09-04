import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { FightEntity } from '@/domain/fight/domain/entities/fight.entity';

export type FightQueueGroup = {
  key: string;
  fights: FightEntity[];
  athleteIds: number[];
  representativeFight: FightEntity;
  preferredAreaId?: number | null;
};

export type AreaDistributionContext = {
  competitionId: number;
  areas: Array<{ id: number; order: number }>;
  fights: FightEntity[];
  athleteBirthDatesById: Map<number, Date>;
  /**
   * Categoria -> area onde ela ja aconteceu. Vem das lutas que nao entram na
   * redistribuicao (encerradas ou canceladas) mas continuam presas a um tatame.
   * Sem isso, uma redistribuicao total move a parte pendente de uma chave para
   * outra area e parte a categoria em duas.
   */
  anchoredAreaIdByCategoryId: Map<number, number>;
};

export type AreaDistributionResult = Array<{
  areaId: number;
  groups: FightQueueGroup[];
}>;

export abstract class AreaDistributionStrategy {
  abstract readonly mode: CompetitionMode;
  abstract distribute(context: AreaDistributionContext): AreaDistributionResult;
}
