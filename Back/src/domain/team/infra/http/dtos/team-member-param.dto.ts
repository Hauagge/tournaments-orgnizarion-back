import { z } from 'zod';

export const TeamMemberParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  athleteId: z.coerce.number().int().positive(),
});

export type TeamMemberParamDto = z.infer<typeof TeamMemberParamSchema>;
