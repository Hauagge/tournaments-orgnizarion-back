import { z } from 'zod';

export const AddAthleteToCategorySchema = z.object({
  athleteId: z.coerce.number().int().positive(),
});

export type AddAthleteToCategoryDto = z.infer<
  typeof AddAthleteToCategorySchema
>;
