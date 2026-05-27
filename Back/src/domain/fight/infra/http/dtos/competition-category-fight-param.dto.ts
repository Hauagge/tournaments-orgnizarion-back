import { z } from 'zod';

export const CompetitionCategoryFightParamSchema = z.object({
  competitionId: z.coerce.number().int().positive(),
  categoryId: z.coerce.number().int().positive(),
});

export type CompetitionCategoryFightParamDto = z.infer<
  typeof CompetitionCategoryFightParamSchema
>;
