import { z } from 'zod';

export const SetKeyGroupPodiumSchema = z.object({
  firstAthleteId: z.number().int().positive().nullable(),
  secondAthleteId: z.number().int().positive().nullable(),
});

export type SetKeyGroupPodiumDto = z.infer<typeof SetKeyGroupPodiumSchema>;
