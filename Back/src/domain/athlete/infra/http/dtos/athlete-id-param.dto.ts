import { z } from 'zod';

export const AthleteIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type AthleteIdParamDto = z.infer<typeof AthleteIdParamSchema>;
