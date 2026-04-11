import { AreaQueueItemStatus } from '../../domain/value-objects/area-queue-item-status.enum';

export type AreaListFightView = {
  queueItemId?: number;
  fightId: number;
  position?: number;
  queueStatus?: AreaQueueItemStatus;
  fightStatus: string;
  athleteAId: number;
  athleteAName: string | null;
  athleteBId: number;
  athleteBName: string | null;
  keyGroupId: number | null;
  orderIndex: number;
};

export type AreaListItemView = {
  id: number | string;
  name?: string;
  queueCount?: number | string;
  queuedFights?: number | string;
  fightCount?: number | string;
  next?: AreaListFightView | null;
  currentFight?: AreaListFightView | null;
  queue?: AreaListFightView[];
  fights?: AreaListFightView[];
};
