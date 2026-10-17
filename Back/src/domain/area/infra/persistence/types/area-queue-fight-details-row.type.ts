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
  academyAName: string | null;
  academyBName: string | null;
  keyGroupName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  roundNumber: string;
  nextFightId: string | null;
  nextFightSlot: 'A' | 'B' | null;
};
