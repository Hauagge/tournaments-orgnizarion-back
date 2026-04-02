import { z } from 'zod';

export const AreaIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type AreaIdParamDto = z.infer<typeof AreaIdParamSchema>;
