import { z } from 'zod';

export const CompetitionAreaParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CompetitionAreaParamDto = z.infer<typeof CompetitionAreaParamSchema>;
