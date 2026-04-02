import { z } from 'zod';

export const ListKeyGroupsSchema = z.object({
  categoryId: z.coerce.number().int().positive().optional(),
});

export type ListKeyGroupsDto = z.infer<typeof ListKeyGroupsSchema>;
