import { z } from 'zod';

export const AddAthleteToCategoryParamSchema = z.object({
  competitionId: z.coerce.number().int().positive(),
  categoryId: z.coerce.number().int().positive(),
});

export type AddAthleteToCategoryParamDto = z.infer<
  typeof AddAthleteToCategoryParamSchema
>;
