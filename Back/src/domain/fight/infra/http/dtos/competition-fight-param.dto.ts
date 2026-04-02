import { z } from 'zod';

export const CompetitionFightParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CompetitionFightParamDto = z.infer<typeof CompetitionFightParamSchema>;
