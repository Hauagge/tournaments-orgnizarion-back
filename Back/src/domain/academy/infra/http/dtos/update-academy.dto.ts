import { z } from 'zod';

export const UpdateAcademySchema = z
  .object({
    name: z.string().min(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export type UpdateAcademyDto = z.infer<typeof UpdateAcademySchema>;
