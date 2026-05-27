import { z } from 'zod';

export const MarkFightWinnerSchema = z.object({
  winnerId: z.coerce.number().int().positive(),
});

export type MarkFightWinnerDto = z.infer<typeof MarkFightWinnerSchema>;
