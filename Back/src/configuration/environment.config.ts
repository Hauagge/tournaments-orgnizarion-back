import { z, ZodObject } from 'zod'
import { Logger } from './logger.configuration'

export function createEnvironment<T extends ZodObject<any>>(
  environmentSchema: T,
): NonNullable<z.infer<T>> {
  if (!environmentSchema) {
    Logger.error('EnvironmentSchema not defined')
    process.exit(1)
  }

  const schemaShape = environmentSchema._def.shape()
  const processEnv: Record<string, string | number | undefined> = Object.keys(
    schemaShape,
  ).reduce(
    (acc, key) => {
      acc[key] = process.env[key]
      return acc
    },
    {} as Record<string, string | undefined>,
  )

  const validationResult = environmentSchema.safeParse(processEnv)
  if (!validationResult.success) {
    Logger.error(
      'Environment validation failed',
      validationResult.error.format(),
    )
  }

  return validationResult.data as NonNullable<z.infer<T>>
}
