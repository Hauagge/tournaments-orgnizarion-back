import { AreaQueueItem } from '../../domain/entities/area-queue-item.entity';

export type FightAreaAssignment = {
  fightId: number;
  areaId: number;
};

export type FightQueuePlanAreaSummary = {
  areaId: number;
  queuedFights: number;
};

export type FightQueuePlan = {
  assignments: FightAreaAssignment[];
  queueItems: AreaQueueItem[];
  areas: FightQueuePlanAreaSummary[];
};
