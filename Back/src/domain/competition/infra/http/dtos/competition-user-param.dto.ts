import { z } from 'zod';

export const CompetitionUserParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  userId: z.coerce.number().int().positive(),
});

export type CompetitionUserParamDto = z.infer<typeof CompetitionUserParamSchema>;
