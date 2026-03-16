import { z } from 'zod';
import { CompetitionMode } from '../../../domain/value-objects/competition-mode.enum';

export const UpdateCompetitionSettingsSchema = z
  .object({
    name: z.string().min(1).optional(),
    mode: z.nativeEnum(CompetitionMode).optional(),
    fightDurationSeconds: z.coerce.number().int().min(1).optional(),
    weighInMarginGrams: z.coerce.number().int().min(0).optional(),
    ageSplitYears: z.coerce.number().int().min(0).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export type UpdateCompetitionSettingsDto = z.infer<
  typeof UpdateCompetitionSettingsSchema
>;
