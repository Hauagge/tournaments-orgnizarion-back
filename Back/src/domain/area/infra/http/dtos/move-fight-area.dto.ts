import { z } from 'zod';

export const MoveFightAreaParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  fightId: z.coerce.number().int().positive(),
});

export type MoveFightAreaParamDto = z.infer<typeof MoveFightAreaParamSchema>;

export const MoveFightAreaSchema = z.object({
  toAreaId: z.coerce.number().int().positive(),
  orderIndex: z.coerce.number().int().min(0).optional(),
});

export type MoveFightAreaDto = z.infer<typeof MoveFightAreaSchema>;
