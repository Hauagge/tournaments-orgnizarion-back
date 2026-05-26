import { z } from 'zod';

export const CreateCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    belt: z.string().trim().min(1).max(50),
    ageMin: z.coerce.number().int().nonnegative().nullable().optional(),
    ageMax: z.coerce.number().int().nonnegative().nullable().optional(),
    weightMinGrams: z.coerce.number().int().nonnegative().nullable().optional(),
    weightMaxGrams: z.coerce.number().int().nonnegative().nullable().optional(),
    allowMerge: z.coerce.boolean().optional().default(false),
    mergeWithBelt: z.string().trim().min(1).max(50).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.allowMerge && !value.mergeWithBelt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['mergeWithBelt'],
        message: 'mergeWithBelt is required when allowMerge is true',
      });
    }

    if (!value.allowMerge && value.mergeWithBelt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['mergeWithBelt'],
        message: 'mergeWithBelt must be empty when allowMerge is false',
      });
    }
  });

export type CreateCategoryDto = z.infer<typeof CreateCategorySchema>;
