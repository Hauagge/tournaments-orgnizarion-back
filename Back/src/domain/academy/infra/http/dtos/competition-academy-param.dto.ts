import { z } from 'zod';

export const CompetitionAcademyParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CompetitionAcademyParamDto = z.infer<
  typeof CompetitionAcademyParamSchema
>;
