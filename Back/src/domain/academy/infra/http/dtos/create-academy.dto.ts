import { z } from 'zod';

export const CreateAcademySchema = z.object({
  name: z.string().min(1),
});

export type CreateAcademyDto = z.infer<typeof CreateAcademySchema>;
