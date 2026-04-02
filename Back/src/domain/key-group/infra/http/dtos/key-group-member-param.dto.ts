import { z } from 'zod';

export const KeyGroupMemberParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  athleteId: z.coerce.number().int().positive(),
});

export type KeyGroupMemberParamDto = z.infer<typeof KeyGroupMemberParamSchema>;
