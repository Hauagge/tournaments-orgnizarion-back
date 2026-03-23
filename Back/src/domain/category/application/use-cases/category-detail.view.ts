import { WeighInStatus } from '@/domain/weighin/domain/value-objects/weigh-in-status.enum';

export type CategoryDetailAthleteView = {
  id: number;
  fullName: string;
  belt: string;
  teamName: string | null;
  weighInStatus: WeighInStatus;
};

export type CategoryDetailView = {
  id: number;
  competitionId: number;
  name: string;
  belt: string;
  ageMin: number | null;
  ageMax: number | null;
  weightMinGrams: number | null;
  weightMaxGrams: number | null;
  totalAthletes: number;
  athletes: CategoryDetailAthleteView[];
};
