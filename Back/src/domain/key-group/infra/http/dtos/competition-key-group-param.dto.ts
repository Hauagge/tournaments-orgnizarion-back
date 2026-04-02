import { z } from 'zod';

export const CompetitionKeyGroupParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CompetitionKeyGroupParamDto = z.infer<typeof CompetitionKeyGroupParamSchema>;
