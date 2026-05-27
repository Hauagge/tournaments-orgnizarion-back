import { z } from 'zod';

export const CreateManualFightSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  athleteAId: z.coerce.number().int().positive(),
  athleteBId: z.coerce.number().int().positive(),
  round: z.coerce.number().int().positive(),
  order: z.coerce.number().int().positive(),
  areaId: z.coerce.number().int().positive().optional(),
});

export type CreateManualFightDto = z.infer<typeof CreateManualFightSchema>;
