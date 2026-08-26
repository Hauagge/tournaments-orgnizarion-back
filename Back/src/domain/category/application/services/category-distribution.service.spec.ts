import { describe, expect, it } from 'vitest';
import { WeighIn } from '@/domain/weighin/domain/entities/weigh-in.entity';
import { WeighInStatus } from '@/domain/weighin/domain/value-objects/weigh-in-status.enum';
import { makeAthlete, makeCategory } from '../../../../../test/factories';
import { CategoryEligibilityService } from './category-eligibility.service';
import {
  CategoryDistributionService,
  DistributionRejectionReason,
} from './category-distribution.service';

describe('CategoryDistributionService', () => {
  it('prioritizes age-specific category over generic category after mandatory belt match', () => {
    const service = new CategoryDistributionService(
      new CategoryEligibilityService(),
    );
    const under17Category = makeCategory({
      id: 10,
      name: 'Faixa Branca até 17 anos',
      belt: 'white',
      ageMin: null,
      ageMax: 17,
      weightMinGrams: null,
      weightMaxGrams: null,
    });
    const genericWhiteCategory = makeCategory({
      id: 11,
      name: 'Faixa Branca',
      belt: 'white',
      ageMin: null,
      ageMax: null,
      weightMinGrams: null,
      weightMaxGrams: null,
    });
    const genericBlueCategory = makeCategory({
      id: 12,
      name: 'Faixa Azul',
      belt: 'blue',
      ageMin: null,
      ageMax: null,
      weightMinGrams: null,
      weightMaxGrams: null,
    });
    const athlete16 = makeAthlete({
      id: 100,
      fullName: 'Atleta Branco 16',
      belt: 'white',
      birthDate: new Date('2010-05-10T00:00:00.000Z'),
      declaredWeight: 65000,
    });
    const athlete18 = makeAthlete({
      id: 101,
      fullName: 'Atleta Branco 18',
      belt: 'white',
      birthDate: new Date('2008-05-10T00:00:00.000Z'),
      declaredWeight: 65000,
    });
    const blueAthlete = makeAthlete({
      id: 102,
      fullName: 'Atleta Azul',
      belt: 'blue',
      birthDate: new Date('2010-05-10T00:00:00.000Z'),
      declaredWeight: 65000,
    });

    const result = service.distribute({
      athletes: [athlete16, athlete18, blueAthlete],
      categories: [genericWhiteCategory, under17Category, genericBlueCategory],
      weighInsByAthleteId: new Map([
        [100, approvedWeighIn(100, 65000)],
        [101, approvedWeighIn(101, 65000)],
        [102, approvedWeighIn(102, 65000)],
      ]),
      alreadyAssignedAthleteIds: new Set(),
      referenceDate: new Date('2026-05-23T00:00:00.000Z'),
    });

    expect(result.allocated).toEqual(
      expect.arrayContaining([
        { athleteId: 100, categoryId: 10 },
        { athleteId: 101, categoryId: 11 },
        { athleteId: 102, categoryId: 12 },
      ]),
    );
  });

  it('does not send athletes to categories from another belt while applying age specificity', () => {
    const service = new CategoryDistributionService(
      new CategoryEligibilityService(),
    );
    const under17WhiteCategory = makeCategory({
      id: 10,
      belt: 'white',
      ageMin: null,
      ageMax: 17,
      weightMinGrams: null,
      weightMaxGrams: null,
    });
    const blueAthlete = makeAthlete({
      id: 102,
      belt: 'blue',
      birthDate: new Date('2010-05-10T00:00:00.000Z'),
      declaredWeight: 65000,
    });

    const result = service.distribute({
      athletes: [blueAthlete],
      categories: [under17WhiteCategory],
      weighInsByAthleteId: new Map([[102, approvedWeighIn(102, 65000)]]),
      alreadyAssignedAthleteIds: new Set(),
      referenceDate: new Date('2026-05-23T00:00:00.000Z'),
    });

    expect(result.allocated).toEqual([]);
    expect(result.rejected).toEqual([
      expect.objectContaining({
        athleteId: 102,
        reason: DistributionRejectionReason.BELT_MISMATCH,
      }),
    ]);
  });
});

function approvedWeighIn(athleteId: number, measuredWeightGrams: number) {
  return WeighIn.restore({
    id: athleteId,
    competitionId: 1,
    athleteId,
    measuredWeightGrams,
    status: WeighInStatus.APPROVED,
    performedAt: new Date('2026-05-23T10:00:00.000Z'),
    performedById: null,
    performedBy: 'mesa-1',
    observation: null,
  });
}
