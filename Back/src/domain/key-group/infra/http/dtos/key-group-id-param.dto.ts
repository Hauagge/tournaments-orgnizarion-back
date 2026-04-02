import { z } from 'zod';

export const KeyGroupIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type KeyGroupIdParamDto = z.infer<typeof KeyGroupIdParamSchema>;
