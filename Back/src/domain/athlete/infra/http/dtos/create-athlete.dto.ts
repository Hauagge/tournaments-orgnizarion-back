import { z } from 'zod';
import { PaymentStatus } from '../../../domain/value-objects/payment-status.enum';

export const CreateAthleteSchema = z.object({
  fullName: z.string().min(1),
  documentNumber: z.string().trim().min(1).nullable().optional().default(null),
  birthDate: z.coerce.date(),
  belt: z.string().min(1),
  declaredWeight: z.coerce.number().int().min(0),
  paymentStatus: z
    .nativeEnum(PaymentStatus)
    .optional()
    .default(PaymentStatus.PENDING),
  academyId: z.coerce
    .number()
    .int()
    .positive()
    .nullable()
    .optional()
    .default(null),
});

export type CreateAthleteDto = z.infer<typeof CreateAthleteSchema>;
