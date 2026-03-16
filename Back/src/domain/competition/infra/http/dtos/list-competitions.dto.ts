import { z } from 'zod';

export const ListCompetitionsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type ListCompetitionsDto = z.infer<typeof ListCompetitionsSchema>;
