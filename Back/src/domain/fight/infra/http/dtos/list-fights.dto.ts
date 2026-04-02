import { z } from 'zod';
import { FightStatus } from '../../../domain/value-objects/fight-status.enum';

export const ListFightsSchema = z.object({
  status: z.nativeEnum(FightStatus).optional(),
});

export type ListFightsDto = z.infer<typeof ListFightsSchema>;
