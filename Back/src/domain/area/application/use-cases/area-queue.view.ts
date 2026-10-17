import { AreaQueueItemStatus } from '../../domain/value-objects/area-queue-item-status.enum';

export type AreaQueueFightView = {
  queueItemId: number;
  fightId: number;
  position: number;
  queueStatus: AreaQueueItemStatus;
  fightStatus: string;
  athleteAId: number | null;
  athleteAName: string | null;
  athleteBId: number | null;
  athleteBName: string | null;
  keyGroupId: number | null;
  orderIndex: number;
  academyAName: string | null;
  academyBName: string | null;
  keyGroupName: string | null;
  categoryId: number | null;
  categoryName: string | null;
  roundNumber: number;
  nextFightId: number | null;
  nextFightSlot: 'A' | 'B' | null;
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
