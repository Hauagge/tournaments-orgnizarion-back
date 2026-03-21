import { WeighInStatus } from '../../domain/value-objects/weigh-in-status.enum';

export type WeighInStatusView = {
  id: number | null;
  competitionId: number;
  athleteId: number;
  athleteName: string;
  declaredWeightGrams: number;
  measuredWeightGrams: number | null;
  status: WeighInStatus;
  performedAt: Date | null;
  performedBy: string | null;
};
