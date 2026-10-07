import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';
import { AreaQueueItemStatus } from '../domain/value-objects/area-queue-item-status.enum';

export type AreaQueueFightDetails = {
  queueItemId: number;
  fightId: number;
  position: number;
  queueStatus: AreaQueueItemStatus;
  fightStatus: FightStatus;
  athleteAId: number | null;
  athleteAName: string | null;
  athleteBId: number | null;
  athleteBName: string | null;
  keyGroupId: number | null;
  orderIndex: number;
};
