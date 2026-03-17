import { z } from 'zod';

export const SearchAthletesSchema = z.object({
  query: z.string().trim().optional(),
  teamId: z.coerce.number().int().positive().optional(),
});

export type SearchAthletesDto = z.infer<typeof SearchAthletesSchema>;
