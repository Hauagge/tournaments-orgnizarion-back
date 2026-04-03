import { z } from 'zod';

export const CreateKeyGroupSchema = z.object({
  categoryId: z.coerce.number().int().positive().nullable().optional(),
  name: z.string().trim().min(1).max(120).nullable().optional(),
  athleteIds: z
    .array(z.coerce.number().int().positive())
    .max(4)
    .optional(),
});

export type CreateKeyGroupDto = z.infer<typeof CreateKeyGroupSchema>;
