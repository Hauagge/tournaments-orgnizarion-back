import { z } from 'zod';

export const ResetWeighInSchema = z.object({
  athleteId: z.coerce.number().int().positive(),
});

export type ResetWeighInDto = z.infer<typeof ResetWeighInSchema>;
