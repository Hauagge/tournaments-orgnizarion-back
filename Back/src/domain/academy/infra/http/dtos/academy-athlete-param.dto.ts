import { z } from 'zod';

export const AcademyAthleteParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  athleteId: z.coerce.number().int().positive(),
});

export type AcademyAthleteParamDto = z.infer<typeof AcademyAthleteParamSchema>;
