import { z } from 'zod';
import { FightStatus } from '../../../domain/value-objects/fight-status.enum';

export const UpdateFightSchema = z.object({
  athleteAId: z.coerce.number().int().positive().nullable().optional(),
  athleteBId: z.coerce.number().int().positive().nullable().optional(),
  round: z.coerce.number().int().positive().optional(),
  order: z.coerce.number().int().positive().optional(),
  areaId: z.coerce.number().int().positive().nullable().optional(),
  status: z.nativeEnum(FightStatus).optional(),
});

export type UpdateFightDto = z.infer<typeof UpdateFightSchema>;
