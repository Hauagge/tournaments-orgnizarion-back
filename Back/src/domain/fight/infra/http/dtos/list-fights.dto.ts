import { z } from 'zod';
import { FightStatus } from '../../../domain/value-objects/fight-status.enum';

export const ListFightsSchema = z.object({
  status: z.nativeEnum(FightStatus).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  round: z.coerce.number().int().positive().optional(),
  areaId: z.coerce.number().int().positive().optional(),
  athleteName: z.string().trim().min(1).optional(),
});

export type ListFightsDto = z.infer<typeof ListFightsSchema>;
