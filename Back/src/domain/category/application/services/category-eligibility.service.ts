import { Injectable } from '@nestjs/common';
import { Athlete } from '@/domain/athlete/domain/entities/athlete.entity';
import { WeighIn } from '@/domain/weighin/domain/entities/weigh-in.entity';
import { WeighInStatus } from '@/domain/weighin/domain/value-objects/weigh-in-status.enum';
import { Category } from '../../domain/entities/category.entity';

export enum CategoryEligibilityReason {
  ALREADY_ASSIGNED = 'ALREADY_ASSIGNED',
  WEIGH_IN_NOT_APPROVED = 'WEIGH_IN_NOT_APPROVED',
  BELT_MISMATCH = 'BELT_MISMATCH',
  WEIGHT_BELOW_MIN = 'WEIGHT_BELOW_MIN',
  WEIGHT_ABOVE_MAX = 'WEIGHT_ABOVE_MAX',
  AGE_BELOW_MIN = 'AGE_BELOW_MIN',
  AGE_ABOVE_MAX = 'AGE_ABOVE_MAX',
}

export type CategoryEligibilityIssue = {
  reason: CategoryEligibilityReason;
  detail: string;
};

export type EvaluateCategoryEligibilityInput = {
  athlete: Athlete;
  category: Category;
  weighIn?: WeighIn | null;
  alreadyAssignedToAnotherCategory?: boolean;
  referenceDate?: Date;
};

@Injectable()
export class CategoryEligibilityService {
  evaluateForCategory(
    input: EvaluateCategoryEligibilityInput,
  ): CategoryEligibilityIssue[] {
    const issues: CategoryEligibilityIssue[] = [];

    if (input.alreadyAssignedToAnotherCategory) {
      issues.push({
        reason: CategoryEligibilityReason.ALREADY_ASSIGNED,
        detail: 'Atleta já alocado em outra categoria',
      });
    }

    if (!input.weighIn || input.weighIn.status !== WeighInStatus.APPROVED) {
      issues.push({
        reason: CategoryEligibilityReason.WEIGH_IN_NOT_APPROVED,
        detail: 'Pesagem não aprovada para o atleta',
      });
    }

    if (!input.category.allowsBelt(input.athlete.belt)) {
      issues.push({
        reason: CategoryEligibilityReason.BELT_MISMATCH,
        detail: input.category.allowMerge
          ? `Faixa ${input.athlete.belt} não permitida na categoria`
          : `Categoria aceita apenas a faixa ${input.category.belt}`,
      });
    }

    const age = this.calculateAge(
      input.athlete.birthDate,
      input.referenceDate ?? new Date(),
    );

    if (input.category.ageMin !== null && age < input.category.ageMin) {
      issues.push({
        reason: CategoryEligibilityReason.AGE_BELOW_MIN,
        detail: `Idade ${age} abaixo do mínimo da categoria`,
      });
    }

    if (input.category.ageMax !== null && age > input.category.ageMax) {
      issues.push({
        reason: CategoryEligibilityReason.AGE_ABOVE_MAX,
        detail: `Idade ${age} acima do máximo da categoria`,
      });
    }

    const weightGrams =
      input.weighIn?.measuredWeightGrams ?? input.athlete.declaredWeight;

    if (
      input.category.weightMinGrams !== null &&
      weightGrams < input.category.weightMinGrams
    ) {
      issues.push({
        reason: CategoryEligibilityReason.WEIGHT_BELOW_MIN,
        detail: `Peso ${(weightGrams / 1000).toFixed(3)}kg abaixo do mínimo da categoria`,
      });
    }

    if (
      input.category.weightMaxGrams !== null &&
      weightGrams > input.category.weightMaxGrams
    ) {
      issues.push({
        reason: CategoryEligibilityReason.WEIGHT_ABOVE_MAX,
        detail: `Peso ${(weightGrams / 1000).toFixed(3)}kg acima do máximo da categoria`,
      });
    }

    return issues;
  }

  calculateAge(birthDate: Date, referenceDate: Date): number {
    return referenceDate.getFullYear() - birthDate.getFullYear();
  }
}
