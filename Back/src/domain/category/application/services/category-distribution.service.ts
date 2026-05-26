import { Injectable } from '@nestjs/common';
import { Athlete } from '@/domain/athlete/domain/entities/athlete.entity';
import { WeighIn } from '@/domain/weighin/domain/entities/weigh-in.entity';
import { Category } from '../../domain/entities/category.entity';
import {
  CategoryEligibilityReason,
  CategoryEligibilityService,
} from './category-eligibility.service';

export enum DistributionRejectionReason {
  ALREADY_ASSIGNED = 'ALREADY_ASSIGNED',
  WEIGH_IN_NOT_APPROVED = 'WEIGH_IN_NOT_APPROVED',
  BELT_MISMATCH = 'BELT_MISMATCH',
  WEIGHT_OUT_OF_RANGE = 'WEIGHT_OUT_OF_RANGE',
  AGE_OUT_OF_RANGE = 'AGE_OUT_OF_RANGE',
  NO_MATCHING_CATEGORY = 'NO_MATCHING_CATEGORY',
}

export type CategoryDistributionInput = {
  athletes: Athlete[];
  categories: Category[];
  weighInsByAthleteId: Map<number, WeighIn>;
  alreadyAssignedAthleteIds: Set<number>;
  referenceDate?: Date;
};

export type AllocatedAthlete = {
  athleteId: number;
  categoryId: number;
};

export type RejectedAthlete = {
  athleteId: number;
  reason: DistributionRejectionReason;
  detail: string;
};

export type CategoryDistributionResult = {
  allocated: AllocatedAthlete[];
  rejected: RejectedAthlete[];
};

@Injectable()
export class CategoryDistributionService {
  constructor(
    private readonly categoryEligibilityService: CategoryEligibilityService,
  ) {}

  distribute(input: CategoryDistributionInput): CategoryDistributionResult {
    const referenceDate = input.referenceDate ?? new Date();
    const allocated: AllocatedAthlete[] = [];
    const rejected: RejectedAthlete[] = [];

    for (const athlete of input.athletes) {
      const athleteId = athlete.id;

      if (!athleteId) {
        continue;
      }

      if (input.alreadyAssignedAthleteIds.has(athleteId)) {
        rejected.push({
          athleteId,
          reason: DistributionRejectionReason.ALREADY_ASSIGNED,
          detail: 'Atleta já alocado em outra categoria',
        });
        continue;
      }

      const weighIn = input.weighInsByAthleteId.get(athleteId);

      const beltMatches = input.categories.filter((category) =>
        category.allowsBelt(athlete.belt),
      );

      if (beltMatches.length === 0) {
        rejected.push({
          athleteId,
          reason: DistributionRejectionReason.BELT_MISMATCH,
          detail: `Nenhuma categoria compatível com a faixa ${athlete.belt}`,
        });
        continue;
      }

      const ageMatches = beltMatches.filter(
        (category) =>
          !this.categoryEligibilityService
            .evaluateForCategory({
              athlete,
              category,
              weighIn,
              referenceDate,
            })
            .some(
              (issue) =>
                issue.reason === CategoryEligibilityReason.AGE_BELOW_MIN ||
                issue.reason === CategoryEligibilityReason.AGE_ABOVE_MAX,
            ),
      );

      if (ageMatches.length === 0) {
        const age = this.categoryEligibilityService.calculateAge(
          athlete.birthDate,
          referenceDate,
        );
        rejected.push({
          athleteId,
          reason: DistributionRejectionReason.AGE_OUT_OF_RANGE,
          detail: `Idade ${age} fora dos intervalos das categorias da faixa ${athlete.belt}`,
        });
        continue;
      }

      const weightMatches = ageMatches.filter(
        (category) =>
          !this.categoryEligibilityService
            .evaluateForCategory({
              athlete,
              category,
              weighIn,
              referenceDate,
            })
            .some(
              (issue) =>
                issue.reason === CategoryEligibilityReason.WEIGHT_BELOW_MIN ||
                issue.reason === CategoryEligibilityReason.WEIGHT_ABOVE_MAX,
            ),
      );

      if (weightMatches.length === 0) {
        const weightGrams =
          weighIn?.measuredWeightGrams ?? athlete.declaredWeight;
        rejected.push({
          athleteId,
          reason: DistributionRejectionReason.WEIGHT_OUT_OF_RANGE,
          detail: `Peso ${(weightGrams / 1000).toFixed(3)}kg fora dos intervalos das categorias compatíveis`,
        });
        continue;
      }

      const fullyEligible = weightMatches.filter(
        (category) =>
          this.categoryEligibilityService.evaluateForCategory({
            athlete,
            category,
            weighIn,
            referenceDate,
          }).length === 0,
      );

      if (fullyEligible.length === 0) {
        rejected.push({
          athleteId,
          reason: DistributionRejectionReason.WEIGH_IN_NOT_APPROVED,
          detail: 'Pesagem não aprovada para o atleta',
        });
        continue;
      }

      const winner = this.pickBestCategory(fullyEligible);

      if (!winner || winner.id === undefined) {
        rejected.push({
          athleteId,
          reason: DistributionRejectionReason.NO_MATCHING_CATEGORY,
          detail: 'Nenhuma categoria compatível encontrada',
        });
        continue;
      }

      allocated.push({ athleteId, categoryId: winner.id });
    }

    return { allocated, rejected };
  }

  private pickBestCategory(candidates: Category[]): Category | null {
    if (candidates.length === 0) {
      return null;
    }

    return [...candidates].sort((left, right) => {
      const ageSpecificityDiff =
        this.ageSpecificityRank(left) - this.ageSpecificityRank(right);
      if (ageSpecificityDiff !== 0) {
        return ageSpecificityDiff;
      }

      const ageSpanDiff = this.ageSpan(left) - this.ageSpan(right);
      if (ageSpanDiff !== 0) {
        return ageSpanDiff;
      }

      const weightSpanDiff = this.weightSpan(left) - this.weightSpan(right);
      if (weightSpanDiff !== 0) {
        return weightSpanDiff;
      }

      return (left.id ?? 0) - (right.id ?? 0);
    })[0];
  }

  private ageSpecificityRank(category: Category): number {
    return category.ageMin !== null || category.ageMax !== null ? 0 : 1;
  }

  private weightSpan(category: Category): number {
    const min = category.weightMinGrams;
    const max = category.weightMaxGrams;

    if (min === null && max === null) {
      return Number.POSITIVE_INFINITY;
    }
    if (min === null || max === null) {
      return Number.MAX_SAFE_INTEGER;
    }
    return max - min;
  }

  private ageSpan(category: Category): number {
    const min = category.ageMin;
    const max = category.ageMax;

    if (min === null && max === null) {
      return Number.POSITIVE_INFINITY;
    }
    if (min === null || max === null) {
      return Number.MAX_SAFE_INTEGER;
    }
    return max - min;
  }
}
