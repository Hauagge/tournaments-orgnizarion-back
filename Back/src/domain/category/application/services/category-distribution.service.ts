import { Injectable } from '@nestjs/common';
import { Athlete } from '@/domain/athlete/domain/entities/athlete.entity';
import { WeighIn } from '@/domain/weighin/domain/entities/weigh-in.entity';
import { WeighInStatus } from '@/domain/weighin/domain/value-objects/weigh-in-status.enum';
import { Category } from '../../domain/entities/category.entity';

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

      if (!weighIn || weighIn.status !== WeighInStatus.APPROVED) {
        rejected.push({
          athleteId,
          reason: DistributionRejectionReason.WEIGH_IN_NOT_APPROVED,
          detail: 'Pesagem não aprovada para o atleta',
        });
        continue;
      }

      const weightGrams =
        weighIn.measuredWeightGrams ?? athlete.declaredWeight;
      const age = this.calculateAge(athlete.birthDate, referenceDate);

      const beltMatches = input.categories.filter(
        (category) => category.belt === athlete.belt,
      );

      if (beltMatches.length === 0) {
        rejected.push({
          athleteId,
          reason: DistributionRejectionReason.BELT_MISMATCH,
          detail: `Nenhuma categoria compatível com a faixa ${athlete.belt}`,
        });
        continue;
      }

      const ageMatches = beltMatches.filter((category) =>
        this.matchesAge(category, age),
      );

      if (ageMatches.length === 0) {
        rejected.push({
          athleteId,
          reason: DistributionRejectionReason.AGE_OUT_OF_RANGE,
          detail: `Idade ${age} fora dos intervalos das categorias da faixa ${athlete.belt}`,
        });
        continue;
      }

      const weightMatches = ageMatches.filter((category) =>
        this.matchesWeight(category, weightGrams),
      );

      if (weightMatches.length === 0) {
        rejected.push({
          athleteId,
          reason: DistributionRejectionReason.WEIGHT_OUT_OF_RANGE,
          detail: `Peso ${(weightGrams / 1000).toFixed(3)}kg fora dos intervalos das categorias compatíveis`,
        });
        continue;
      }

      const winner = this.pickBestCategory(weightMatches);

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

  private matchesAge(category: Category, age: number): boolean {
    if (category.ageMin !== null && age < category.ageMin) {
      return false;
    }
    if (category.ageMax !== null && age > category.ageMax) {
      return false;
    }
    return true;
  }

  private matchesWeight(category: Category, weightGrams: number): boolean {
    if (
      category.weightMinGrams !== null &&
      weightGrams < category.weightMinGrams
    ) {
      return false;
    }
    if (
      category.weightMaxGrams !== null &&
      weightGrams > category.weightMaxGrams
    ) {
      return false;
    }
    return true;
  }

  private pickBestCategory(candidates: Category[]): Category | null {
    if (candidates.length === 0) {
      return null;
    }

    return [...candidates].sort((left, right) => {
      const weightSpanDiff =
        this.weightSpan(left) - this.weightSpan(right);
      if (weightSpanDiff !== 0) {
        return weightSpanDiff;
      }

      const ageSpanDiff = this.ageSpan(left) - this.ageSpan(right);
      if (ageSpanDiff !== 0) {
        return ageSpanDiff;
      }

      return (left.id ?? 0) - (right.id ?? 0);
    })[0];
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

  private calculateAge(birthDate: Date, referenceDate: Date): number {
    return referenceDate.getFullYear() - birthDate.getFullYear();
  }
}
