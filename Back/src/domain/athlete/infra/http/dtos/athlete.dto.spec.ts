import { WeighInStatus } from '@/domain/weighin/domain/value-objects/weigh-in-status.enum';
import { describe, expect, it } from 'vitest';
import { AthleteIdParamSchema } from './athlete-id-param.dto';
import { CompetitionAthleteParamSchema } from './competition-athlete-param.dto';
import { CreateAthleteSchema } from './create-athlete.dto';
import { SearchAthletesSchema } from './search-athletes.dto';
import { UpdateAthleteSchema } from './update-athlete.dto';

describe('Athlete DTO schemas', () => {
  it('should validate create payload', () => {
    const result = CreateAthleteSchema.parse({
      fullName: '  Ana   Silva ',
      birthDate: '2010-05-10',
      belt: 'white',
      declaredWeight: '50000',
      weighInStatus: WeighInStatus.APPROVED,
    });

    expect(result).toEqual({
      fullName: '  Ana   Silva ',
      documentNumber: null,
      birthDate: new Date('2010-05-10T00:00:00.000Z'),
      belt: 'white',
      declaredWeight: 50000,
      paymentStatus: 'PENDING',
      weighInStatus: WeighInStatus.APPROVED,
      academyId: null,
    });
  });

  it('should validate update payload', () => {
    const result = UpdateAthleteSchema.parse({
      academyId: null,
      declaredWeightGrams: '47000',
    });

    expect(result).toEqual({
      academyId: null,
      declaredWeightGrams: 47000,
    });
  });

  it('should reject empty update payload', () => {
    expect(UpdateAthleteSchema.safeParse({}).success).toBe(false);
  });

  it('should validate search query', () => {
    const result = SearchAthletesSchema.parse({
      query: ' ana ',
      academyId: '8',
    });

    expect(result).toEqual({
      query: 'ana',
      academyId: 8,
    });
  });

  it('should validate route params', () => {
    expect(AthleteIdParamSchema.parse({ id: '3' })).toEqual({ id: 3 });
    expect(CompetitionAthleteParamSchema.parse({ id: '7' })).toEqual({
      id: 7,
    });
  });
});
