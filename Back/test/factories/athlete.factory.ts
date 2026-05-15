import { PaymentStatus } from '../../src/domain/athlete/domain/value-objects/payment-status.enum';
import { Athlete } from '../../src/domain/athlete/domain/entities/athlete.entity';

export function makeAthlete(
  overrides: Partial<ReturnType<Athlete['toJSON']>> = {},
): Athlete {
  return Athlete.restore({
    id: 1,
    competitionId: 1,
    fullName: 'Athlete Test',
    documentNumber: null,
    birthDate: new Date('2010-05-10T00:00:00.000Z'),
    belt: 'white',
    declaredWeight: 50000,
    paymentStatus: PaymentStatus.PENDING,
    academyId: 3,
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
    ...overrides,
  });
}
