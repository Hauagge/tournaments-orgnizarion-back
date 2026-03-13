import z from 'zod';

export const CreateAthleteSchema = z.object({
  name: z.string().min(1),
  age: z.coerce.number().min(0),
  weight: z.coerce.number().min(0),
  beltColor: z.string(),
  tutor: z.string().optional(),
});

export type CreateAthleteDTO = z.infer<typeof CreateAthleteSchema>;
