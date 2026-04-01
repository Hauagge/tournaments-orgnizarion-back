import { z } from 'zod';

export const CreateAthleteSchema = z.object({
  fullName: z.string().min(1),
  birthDate: z.coerce.date(),
  belt: z.string().min(1),
  declaredWeightGrams: z.coerce.number().int().min(0),
  academyId: z.coerce.number().int().positive().nullable().optional().default(null),
});

export type CreateAthleteDto = z.infer<typeof CreateAthleteSchema>;
