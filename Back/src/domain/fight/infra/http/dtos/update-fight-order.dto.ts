import { z } from 'zod';

export const UpdateFightOrderSchema = z.object({
  items: z
    .array(
      z.object({
        fightId: z.coerce.number().int().positive(),
        orderIndex: z.coerce.number().int().min(1),
      }),
    )
    .min(1),
});

export type UpdateFightOrderDto = z.infer<typeof UpdateFightOrderSchema>;
