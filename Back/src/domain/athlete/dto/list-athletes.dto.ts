import { z } from 'zod';

export const ListAthletesSchema = z.object({
  filter: z.object({
    id: z.coerce.number().optional(),
    name: z.string().min(1).optional(),
    belt: z.string().optional(),
    weight: z.coerce.number().optional(),
    age: z.coerce.number().optional(),
  }),
});

export type ListAthletesDTO = z.infer<typeof ListAthletesSchema>;
