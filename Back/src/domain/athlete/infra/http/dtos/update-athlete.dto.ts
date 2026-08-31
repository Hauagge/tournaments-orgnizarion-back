import { z } from 'zod';
import {
  AthleteGender,
  parseAthleteGender,
} from '../../../domain/value-objects/athlete-gender.enum';
import { PaymentStatus } from '../../../domain/value-objects/payment-status.enum';

export const UpdateAthleteSchema = z
  .object({
    fullName: z.string().min(1).optional(),
    birthDate: z.coerce.date().optional(),
    belt: z.string().min(1).optional(),
    gender: z
      .union([z.string(), z.null()])
      .optional()
      .transform((value) =>
        value === undefined ? undefined : parseAthleteGender(value),
      )
      .pipe(z.nativeEnum(AthleteGender).nullable().optional()),
    declaredWeightGrams: z.coerce.number().int().min(0).optional(),
    paymentStatus: z.nativeEnum(PaymentStatus).optional(),
    academyId: z.union([z.coerce.number().int().positive(), z.null()]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export type UpdateAthleteDto = z.infer<typeof UpdateAthleteSchema>;
