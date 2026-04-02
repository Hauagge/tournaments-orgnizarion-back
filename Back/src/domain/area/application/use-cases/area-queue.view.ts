import { AreaQueueItemStatus } from '../../domain/value-objects/area-queue-item-status.enum';

export type AreaQueueFightView = {
  queueItemId: number;
  fightId: number;
  position: number;
  queueStatus: AreaQueueItemStatus;
  fightStatus: string;
  athleteAId: number;
  athleteAName: string | null;
  athleteBId: number;
  athleteBName: string | null;
  keyGroupId: number | null;
  orderIndex: number;
};

export type AreaQueueView = {
  area: {
    id: number;
    competitionId: number;
    name: string;
    order: number;
  };
  highlightedFight: AreaQueueFightView | null;
  queue: AreaQueueFightView[];
};
