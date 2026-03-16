import { z } from 'zod';

export const CompetitionIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CompetitionIdParamDto = z.infer<typeof CompetitionIdParamSchema>;
