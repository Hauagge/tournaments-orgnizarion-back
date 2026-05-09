import { z } from 'zod';

export const ManageCompetitionUserSchema = z.object({
  userId: z.coerce.number().int().positive(),
});

export type ManageCompetitionUserDto = z.infer<typeof ManageCompetitionUserSchema>;
