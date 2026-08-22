export enum CompetitionDashboardStatus {
  DRAFT = 'DRAFT',
  READY = 'READY',
  IN_PROGRESS = 'IN_PROGRESS',
  FINISHED = 'FINISHED',
}

export type CompetitionDashboardSummaryItem = {
  competitionId: number;
  name: string;
  athleteCount: number;
  areaCount: number;
  fightsTodayCount: number;
  status: CompetitionDashboardStatus;
  ruleTypeLabel: string;
};
