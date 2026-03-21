import { z } from 'zod';

export const CompetitionTeamParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CompetitionTeamParamDto = z.infer<
  typeof CompetitionTeamParamSchema
>;
