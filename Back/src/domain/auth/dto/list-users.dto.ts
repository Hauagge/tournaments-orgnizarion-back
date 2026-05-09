import { z } from 'zod';

export const ListUsersSchema = z.object({
  search: z.string().trim().min(1).optional(),
});

export type ListUsersDto = z.infer<typeof ListUsersSchema>;
