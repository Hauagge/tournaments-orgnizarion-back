import { z } from 'zod';
import {
  AthleteGender,
  parseAthleteGender,
} from '../../../domain/value-objects/athlete-gender.enum';
import { PaymentStatus } from '../../../domain/value-objects/payment-status.enum';
import { WeighInStatus } from '@/domain/weighin/domain/value-objects/weigh-in-status.enum';

export const CreateAthleteSchema = z.object({
  fullName: z.string().min(1),
  documentNumber: z.string().trim().min(1).nullable().optional().default(null),
  birthDate: z.coerce.date(),
  belt: z.string().min(1),
  gender: z
    .union([z.string(), z.null()])
    .optional()
    .transform((value) => parseAthleteGender(value))
    .pipe(z.nativeEnum(AthleteGender).nullable()),
  declaredWeight: z.coerce.number().int().min(0),
  paymentStatus: z
    .nativeEnum(PaymentStatus)
    .optional()
    .default(PaymentStatus.PENDING),
  weighInStatus: z
    .enum([WeighInStatus.PENDING, WeighInStatus.APPROVED])
    .optional()
    .default(WeighInStatus.PENDING),
  academyId: z.coerce
    .number()
    .int()
    .positive()
    .nullable()
    .optional()
    .default(null),
});

export type CreateAthleteDto = z.infer<typeof CreateAthleteSchema>;
