import { z } from 'zod';

export const CategoryIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CategoryIdParamDto = z.infer<typeof CategoryIdParamSchema>;
