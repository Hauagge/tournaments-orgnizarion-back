import { z } from 'zod';

export const CreateCategorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  belt: z.string().trim().min(1).max(50),
  ageMin: z.coerce.number().int().nonnegative().nullable().optional(),
  ageMax: z.coerce.number().int().nonnegative().nullable().optional(),
  weightMinGrams: z.coerce.number().int().nonnegative().nullable().optional(),
  weightMaxGrams: z.coerce.number().int().nonnegative().nullable().optional(),
  allowMerge: z.coerce.boolean().optional().default(false),
  mergeWithBelt: z.string().trim().min(1).max(50).optional(),
});

export type CreateCategoryDto = z.infer<typeof CreateCategorySchema>;
