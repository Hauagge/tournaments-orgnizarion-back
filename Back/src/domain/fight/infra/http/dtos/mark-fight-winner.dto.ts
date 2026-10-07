import { z } from 'zod';

export const MarkFightWinnerSchema = z.object({
  winnerId: z.coerce.number().int().positive(),
  winType: z.string().trim().min(1).optional(),
});

export type MarkFightWinnerDto = z.infer<typeof MarkFightWinnerSchema>;
