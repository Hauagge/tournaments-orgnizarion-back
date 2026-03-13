import * as z from 'zod'

export const DatabaseEnvironmentSchema = {
  DB_USER: z.string(),
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number(),
  DB_PASS: z.string(),
  DB_NAME: z.string(),
  DB_DEBUG: z.boolean().default(false),
}
