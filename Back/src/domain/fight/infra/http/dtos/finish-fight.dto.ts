import { z } from 'zod';

export const FinishFightSchema = z
  .object({
    winnerAthleteId: z.coerce.number().int().positive(),
    winType: z.string().trim().min(1),
  });

export type FinishFightDto = z.infer<typeof FinishFightSchema>;
