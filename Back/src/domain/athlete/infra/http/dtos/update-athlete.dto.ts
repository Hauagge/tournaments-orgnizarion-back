import { z } from 'zod';
import { PaymentStatus } from '../../../domain/value-objects/payment-status.enum';

export const UpdateAthleteSchema = z
  .object({
    fullName: z.string().min(1).optional(),
    birthDate: z.coerce.date().optional(),
    belt: z.string().min(1).optional(),
    declaredWeightGrams: z.coerce.number().int().min(0).optional(),
    paymentStatus: z.nativeEnum(PaymentStatus).optional(),
    academyId: z.union([z.coerce.number().int().positive(), z.null()]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export type UpdateAthleteDto = z.infer<typeof UpdateAthleteSchema>;
