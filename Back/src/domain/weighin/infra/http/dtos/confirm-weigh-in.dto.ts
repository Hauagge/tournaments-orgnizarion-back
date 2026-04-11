import { WeighInStatus } from '@/domain/weighin/domain/value-objects/weigh-in-status.enum';
import { z } from 'zod';

export const ConfirmWeighInSchema = z.object({
  athleteId: z.coerce.number().int().positive(),
  realWeightGrams: z.coerce.number().int().positive(),
  weighInStatus: z.enum([WeighInStatus.APPROVED, WeighInStatus.REJECTED]),
});

export type ConfirmWeighInDto = z.infer<typeof ConfirmWeighInSchema>;
