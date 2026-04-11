import { z } from 'zod';

export const CreateAthleteSchema = z.object({
  fullName: z.string().min(1),
  documentNumber: z.string().trim().min(1).nullable().optional().default(null),
  birthDate: z.coerce.date(),
  belt: z.string().min(1),
  declaredWeight: z.coerce.number().int().min(0),
  academyId: z.coerce
    .number()
    .int()
    .positive()
    .nullable()
    .optional()
    .default(null),
});

export type CreateAthleteDto = z.infer<typeof CreateAthleteSchema>;
