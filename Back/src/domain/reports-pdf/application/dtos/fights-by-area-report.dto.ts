export type FightsByAreaReportFightView = {
  categoryName: string;
  athleteAName: string;
  athleteBName: string;
};

export type FightsByAreaReportSectionView = {
  areaName: string;
  areaOrder: number | null;
  fights: FightsByAreaReportFightView[];
};

export type FightsByAreaReportView = {
  competitionName: string;
  exportedAt: string;
  sections: FightsByAreaReportSectionView[];
  unassignedSection: FightsByAreaReportSectionView | null;
};
