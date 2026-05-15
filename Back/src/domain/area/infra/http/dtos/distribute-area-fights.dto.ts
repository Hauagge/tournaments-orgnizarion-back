import { z } from 'zod';
import { DistributionMode } from '../../../application/value-objects/distribution-mode.enum';

export const DistributeAreaFightsSchema = z.object({
  mode: z.nativeEnum(DistributionMode).optional().default(DistributionMode.FULL),
  ageSplitYears: z.coerce.number().int().positive().optional(),
  restGapFights: z.coerce.number().int().min(0).optional().default(2),
  fightIds: z.array(z.coerce.number().int().positive()).optional(),
});

export type DistributeAreaFightsDto = z.infer<typeof DistributeAreaFightsSchema>;
