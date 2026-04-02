import { z } from 'zod';

export const FightIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type FightIdParamDto = z.infer<typeof FightIdParamSchema>;
