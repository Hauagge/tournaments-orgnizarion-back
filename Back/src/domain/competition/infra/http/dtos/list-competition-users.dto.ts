import { z } from 'zod';

export const ListCompetitionUsersSchema = z.object({
  search: z.string().trim().min(1).optional(),
  term: z.string().trim().min(1).optional(),
}).refine((data) => !(data.search && data.term), {
  message: 'Use apenas um dos parâmetros: search ou term',
  path: ['term'],
});

export type ListCompetitionUsersDto = z.infer<
  typeof ListCompetitionUsersSchema
>;
