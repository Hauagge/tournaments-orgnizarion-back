import { z } from 'zod';

export const CreateAreasSchema = z
  .object({
    count: z.coerce.number().int().positive().optional(),
    names: z.array(z.string().trim().min(1)).optional(),
  })
  .refine((value) => value.count !== undefined || (value.names?.length ?? 0) > 0, {
    message: 'count or names must be provided',
  });

export type CreateAreasDto = z.infer<typeof CreateAreasSchema>;
