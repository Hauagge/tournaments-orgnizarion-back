import { z } from "zod";

export const CreateTeamSchema = z.object({
  name: z.string().min(1),
});

export type CreateTeamDto = z.infer<typeof CreateTeamSchema>;
