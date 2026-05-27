import { z } from 'zod';

export const CompetitionFightIdParamSchema = z.object({
  competitionId: z.coerce.number().int().positive(),
  fightId: z.coerce.number().int().positive(),
});

export type CompetitionFightIdParamDto = z.infer<
  typeof CompetitionFightIdParamSchema
>;
