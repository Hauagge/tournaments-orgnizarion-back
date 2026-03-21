import { z } from 'zod';

export const SearchWeighInSchema = z.object({
  query: z.string().trim().optional(),
  athleteId: z.coerce.number().int().positive().optional(),
});

export type SearchWeighInDto = z.infer<typeof SearchWeighInSchema>;
