import { z } from 'zod';

export const AcademyIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type AcademyIdParamDto = z.infer<typeof AcademyIdParamSchema>;
