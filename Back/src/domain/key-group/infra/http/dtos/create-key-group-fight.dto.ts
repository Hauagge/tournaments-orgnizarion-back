import { z } from 'zod';

export const CreateKeyGroupFightSchema = z.object({
  athleteAId: z.coerce.number().int().positive(),
  athleteBId: z.coerce.number().int().positive(),
  orderIndex: z.coerce.number().int().positive().optional(),
});

export type CreateKeyGroupFightDto = z.infer<typeof CreateKeyGroupFightSchema>;
