import { z } from 'zod';

export const CompetitionAthleteParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CompetitionAthleteParamDto = z.infer<
  typeof CompetitionAthleteParamSchema
>;
