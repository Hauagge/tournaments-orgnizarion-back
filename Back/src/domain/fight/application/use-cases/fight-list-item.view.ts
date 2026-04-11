import { FightStatus } from '../../domain/value-objects/fight-status.enum';

export type FightListItemView = {
  id?: number;
  competitionId: number;
  categoryId: number | null;
  keyGroupId: number | null;
  areaId: number | null;
  areaName: string | null;
  status: FightStatus;
  athleteAId: number;
  athleteAName: string | null;
  academyAName: string | null;
  athleteBId: number;
  athleteBName: string | null;
  academyBName: string | null;
  winnerAthleteId: number | null;
  winnerAthleteName: string | null;
  winType: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  orderIndex: number;
};
