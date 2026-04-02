import { z } from 'zod';

export const CreateKeyGroupSchema = z.object({
  categoryId: z.number().int().positive().nullable().optional(),
  name: z.string().trim().min(1).max(120).nullable().optional(),
});

export type CreateKeyGroupDto = z.infer<typeof CreateKeyGroupSchema>;
