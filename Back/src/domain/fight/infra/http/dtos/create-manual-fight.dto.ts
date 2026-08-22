import { z } from 'zod';

const optionalPositiveInt = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? undefined : value),
  z.coerce.number().int().positive().optional(),
);

export const CreateManualFightSchema = z.object({
  categoryId: optionalPositiveInt,
  athleteAId: z.coerce.number().int().positive(),
  athleteBId: z.coerce.number().int().positive(),
  round: z.coerce.number().int().positive(),
  order: z.coerce.number().int().positive(),
  areaId: optionalPositiveInt,
});

export type CreateManualFightDto = z.infer<typeof CreateManualFightSchema>;
