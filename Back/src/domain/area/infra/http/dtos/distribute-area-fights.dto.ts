import { z } from 'zod';

export const DistributeAreaFightsSchema = z.object({
  ageSplitYears: z.coerce.number().int().positive().optional(),
  restGapFights: z.coerce.number().int().min(0).optional().default(2),
});

export type DistributeAreaFightsDto = z.infer<typeof DistributeAreaFightsSchema>;
