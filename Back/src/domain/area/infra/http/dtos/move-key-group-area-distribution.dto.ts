import { z } from 'zod';

export const MoveKeyGroupAreaDistributionSchema = z.object({
  keyGroupId: z.coerce.number().int().positive(),
  fromAreaId: z.coerce.number().int().positive(),
  toAreaId: z.coerce.number().int().positive(),
  orderIndex: z.coerce.number().int().min(0),
});

export type MoveKeyGroupAreaDistributionDto = z.infer<
  typeof MoveKeyGroupAreaDistributionSchema
>;
