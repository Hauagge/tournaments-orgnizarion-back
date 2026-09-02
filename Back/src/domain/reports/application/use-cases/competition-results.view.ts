export type ResultAthleteView = {
  athleteId: number;
  athleteName: string;
  academyId: number | null;
  academyName: string | null;
};

export type SeriesResultView = {
  label: string;
  countsForAcademyRanking: boolean;
  first: ResultAthleteView | null;
  second: ResultAthleteView | null;
  thirds: ResultAthleteView[];
};

export type CategoryResultView = {
  categoryId: number;
  categoryName: string;
  belt: string | null;
  ageDivision: string | null;
  weightDivision: string | null;
  totalAthletes: number;
  /** Falso enquanto a categoria ainda tiver luta em aberto. */
  decided: boolean;
  first: ResultAthleteView | null;
  second: ResultAthleteView | null;
  /** Um terceiro em chaves de ate 5 atletas; dois de 6 em diante. */
  thirds: ResultAthleteView[];
  /**
   * Preenchido apenas no formato Ouro/Prata: o podio da Serie Prata, que nao
   * entra na conta de campeoes por academia.
   */
  secondarySeries: SeriesResultView | null;
};

export type CompetitionResultsView = {
  competitionId: number;
  totalCategories: number;
  decidedCategories: number;
  categories: CategoryResultView[];
};
