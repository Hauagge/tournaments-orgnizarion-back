import { z } from 'zod';

export const UpdateKeyGroupSchema = z
  .object({
    name: z.string().trim().min(1).max(120).nullable().optional(),
    categoryId: z.number().int().positive().nullable().optional(),
    athleteIds: z.array(z.number().int().positive()).max(4).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export type UpdateKeyGroupDto = z.infer<typeof UpdateKeyGroupSchema>;
