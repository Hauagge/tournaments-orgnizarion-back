export type FightLineDto = {
  round: string;
  fightNumber: number;
  athleteA: string;
  academyA: string | null;
  athleteB: string;
  academyB: string | null;
  areaName?: string | null;
  winner?: string | null;
  winType?: string | null;
};

export type BracketReportAthleteDto = {
  id: number;
  fullName: string;
  birthDate: string;
  belt: string;
  academyName: string | null;
};

export type BracketStageLineDto = {
  label: string;
  athleteA: string;
  athleteB: string;
  areaName: string | null;
  winner: string | null;
  winType: string | null;
  isPlaceholder: boolean;
};

export type BracketReportDto = {
  categoryName: string;
  bracketName: string;
  athletes: BracketReportAthleteDto[];
  fights: FightLineDto[];
  stage: {
    size: number;
    final: BracketStageLineDto;
    semiFinals: BracketStageLineDto[];
  };
};

export type BracketsReportView = {
  competitionName: string;
  competitionMode: string;
  exportedAt: string;
  includeResults: boolean;
  brackets: BracketReportDto[];
};
