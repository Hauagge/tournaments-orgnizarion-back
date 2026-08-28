export type ChampionAthleteView = {
  athleteId: number;
  athleteName: string;
  categoryId: number;
  categoryName: string;
  belt: string | null;
  ageDivision: string | null;
  weightDivision: string | null;
};

export type ChampionAcademyRankingView = {
  position: number;
  academyId: number | null;
  academyName: string;
  totalChampions: number;
  champions: ChampionAthleteView[];
};

export type ChampionAcademiesReportView = {
  competitionId: number;
  totalChampionAthletes: number;
  academies: ChampionAcademyRankingView[];
};
