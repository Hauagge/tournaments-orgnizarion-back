import { z } from 'zod';
import { CompetitionMode } from '../../../domain/value-objects/competition-mode.enum';

export const CreateCompetitionSchema = z.object({
  name: z.string().min(1),
  mode: z.nativeEnum(CompetitionMode),
  fightDurationSeconds: z.coerce.number().int().min(1),
  weighInMarginGrams: z.coerce.number().int().min(0),
  ageSplitYears: z.coerce.number().int().min(0),
});

export type CreateCompetitionDto = z.infer<typeof CreateCompetitionSchema>;
