import { z } from 'zod';

export const CreateTeamSchema = z.object({
  name: z.string().trim().min(1).optional(),
  athleteIds: z.array(z.coerce.number().int().positive()).length(3),
});

export type CreateTeamDto = z.infer<typeof CreateTeamSchema>;
