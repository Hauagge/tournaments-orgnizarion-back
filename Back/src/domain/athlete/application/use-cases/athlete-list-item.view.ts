import { WeighInStatus } from '@/domain/weighin/domain/value-objects/weigh-in-status.enum';
import { Athlete } from '../../domain/entities/athlete.entity';

export type AthleteListItemView = ReturnType<Athlete['toJSON']> & {
  academyName: string | null;
  weighInStatus: WeighInStatus;
  weighInMeasuredWeightGrams: number | null;
  weighInEvaluatedById: number | null;
  weighInEvaluatedByName: string | null;
  weighInEvaluatedAt: Date | null;
  weighInObservation: string | null;
};
