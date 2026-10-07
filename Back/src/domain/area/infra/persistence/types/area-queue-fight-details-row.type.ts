import { AreaQueueItemStatus } from '../../../domain/value-objects/area-queue-item-status.enum';
import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';

export type AreaQueueFightDetailsRow = {
  queueItemId: string;
  fightId: string;
  position: string;
  queueStatus: AreaQueueItemStatus;
  fightStatus: FightStatus;
  athleteAId: string | null;
  athleteAName: string | null;
  athleteBId: string | null;
  athleteBName: string | null;
  keyGroupId: string | null;
  orderIndex: string;
};
