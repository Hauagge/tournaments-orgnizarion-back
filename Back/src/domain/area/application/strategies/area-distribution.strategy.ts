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
  ageSplitYears: number;
  areas: Array<{ id: number; order: number }>;
  fights: FightEntity[];
  athleteBirthDatesById: Map<number, Date>;
};

export type AreaDistributionResult = Array<{
  areaId: number;
  groups: FightQueueGroup[];
}>;

export abstract class AreaDistributionStrategy {
  abstract distribute(context: AreaDistributionContext): AreaDistributionResult;
}
