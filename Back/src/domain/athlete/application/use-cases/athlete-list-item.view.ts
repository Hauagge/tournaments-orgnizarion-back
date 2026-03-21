import { WeighInStatus } from '@/domain/weighin/domain/value-objects/weigh-in-status.enum';
import { Athlete } from '../../domain/entities/athlete.entity';

export type AthleteListItemView = ReturnType<Athlete['toJSON']> & {
  teamName: string | null;
  weighInStatus: WeighInStatus;
};
