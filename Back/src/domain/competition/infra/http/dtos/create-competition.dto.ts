import { z } from 'zod';

export const CreateCompetitionSchema = z.object({
  name: z.string().min(1),
  mode: z.enum(['KEYS', 'ABSOLUTE_GP']),
  fightDurationSeconds: z.coerce.number().int().min(1),
  weighInMarginGrams: z.coerce.number().int().min(0),
  ageSplitYears: z.coerce.number().int().min(0),
});

export type CreateCompetitionDto = z.infer<typeof CreateCompetitionSchema>;
