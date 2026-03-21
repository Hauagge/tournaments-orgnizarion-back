import { z } from 'zod';

export const ConfirmWeighInSchema = z.object({
  athleteId: z.coerce.number().int().positive(),
  realWeightGrams: z.coerce.number().int().positive(),
});

export type ConfirmWeighInDto = z.infer<typeof ConfirmWeighInSchema>;
