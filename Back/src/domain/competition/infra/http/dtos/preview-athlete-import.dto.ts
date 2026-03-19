import { z } from 'zod';

export const PreviewAthleteImportSchema = z.object({
  csvText: z.string().min(1),
});

export type PreviewAthleteImportDto = z.infer<
  typeof PreviewAthleteImportSchema
>;
