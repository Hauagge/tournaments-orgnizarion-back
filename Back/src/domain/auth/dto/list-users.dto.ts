import { z } from 'zod';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export const ListUsersSchema = z.object({
  // Sem termo de busca, o endpoint devolveria o roster inteiro do sistema.
  // Obrigatorio para que o /users so funcione como typeahead, nunca como listagem.
  search: z.string().trim().min(1),
  page: z.coerce.number().int().positive().default(DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .default(DEFAULT_LIMIT)
    .transform((value) => Math.min(value, MAX_LIMIT)),
});

export type ListUsersDto = z.infer<typeof ListUsersSchema>;
