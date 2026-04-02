import { FightStatus } from '../../domain/value-objects/fight-status.enum';

export type FightListItemView = {
  id?: number;
  competitionId: number;
  categoryId: number | null;
  keyGroupId: number | null;
  areaId: number | null;
  status: FightStatus;
  athleteAId: number;
  athleteAName: string | null;
  athleteBId: number;
  athleteBName: string | null;
  winnerAthleteId: number | null;
  winType: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  orderIndex: number;
};
