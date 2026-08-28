import { z } from 'zod';

const optionalText = z
  .string()
  .trim()
  .min(1)
  .optional()
  .transform((value) => (value === '' ? undefined : value));

export const ChampionAcademiesReportQuerySchema = z.object({
  belt: optionalText,
  ageDivision: optionalText,
  categoryId: z.coerce.number().int().positive().optional(),
});

export type ChampionAcademiesReportQueryDto = z.infer<
  typeof ChampionAcademiesReportQuerySchema
>;
