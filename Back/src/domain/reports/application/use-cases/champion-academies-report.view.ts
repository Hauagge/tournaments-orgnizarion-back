export type ChampionAthleteView = {
  athleteId: number;
  athleteName: string;
  categoryId: number | null;
  categoryName: string | null;
  keyGroupId: number | null;
  keyGroupName: string | null;
  belt: string | null;
  ageDivision: string | null;
  weightDivision: string | null;
};

export type ChampionAcademyRankingView = {
  position: number;
  academyId: number | null;
  academyName: string;
  totalChampions: number;
  /** Pratas e bronzes so desempatam: a posicao sai primeiro dos campeoes. */
  totalSilvers: number;
  totalBronzes: number;
  champions: ChampionAthleteView[];
};

export type ChampionAcademiesReportView = {
  competitionId: number;
  totalChampionAthletes: number;
  academies: ChampionAcademyRankingView[];
};
