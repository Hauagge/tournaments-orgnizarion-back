import { z } from 'zod';

export const TeamAthleteParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  athleteId: z.coerce.number().int().positive(),
});

export type TeamAthleteParamDto = z.infer<typeof TeamAthleteParamSchema>;
