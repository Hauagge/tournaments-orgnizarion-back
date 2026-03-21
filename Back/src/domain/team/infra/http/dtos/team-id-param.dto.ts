import { z } from "zod";

export const TeamIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type TeamIdParamDto = z.infer<typeof TeamIdParamSchema>;
