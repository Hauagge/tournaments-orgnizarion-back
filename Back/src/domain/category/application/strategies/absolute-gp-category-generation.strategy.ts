import { Injectable } from '@nestjs/common';
import { Athlete } from '@/domain/athlete/domain/entities/athlete.entity';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { Category } from '../../domain/entities/category.entity';
import {
  CategoryGenerationStrategy,
  GeneratedCategory,
  WeightClass,
} from './category-generation.strategy';

const ABSOLUTE_GP_WEIGHT_CLASSES: WeightClass[] = [
  { name: 'Ate 80kg', minKg: 0, maxKg: 80 },
  { name: 'Acima de 80kg', minKg: 80.001, maxKg: null },
];

@Injectable()
export class AbsoluteGpCategoryGenerationStrategy extends CategoryGenerationStrategy {
  readonly mode = CompetitionMode.ABSOLUTE_GP;

  generate(competitionId: number, athletes: Athlete[]): GeneratedCategory[] {
    const grouped = new Map<
      string,
      {
        name: string;
        belt: string;
        weightMinGrams: number;
        weightMaxGrams: number | null;
        athleteIds: number[];
      }
    >();

    for (const athlete of athletes) {
      const athleteId = athlete.id;
      if (!athleteId) {
        continue;
      }

      const weightKg = athlete.declaredWeight / 1000;
      const weightClass = this.findWeightClass(
        ABSOLUTE_GP_WEIGHT_CLASSES,
        weightKg,
      );

      if (!weightClass) {
        continue;
      }

      const key = [athlete.belt, weightClass.name].join('|');

      if (!grouped.has(key)) {
        grouped.set(key, {
          name: `${athlete.belt} - ${weightClass.name}`,
          belt: athlete.belt,
          weightMinGrams: Math.round(weightClass.minKg * 1000),
          weightMaxGrams:
            weightClass.maxKg === null
              ? null
              : Math.round(weightClass.maxKg * 1000),
          athleteIds: [],
        });
      }

      grouped.get(key)?.athleteIds.push(athleteId);
    }

    return Array.from(grouped.values())
      .map((group) => ({
        category: Category.create({
          competitionId,
          name: group.name,
          belt: group.belt,
          allowMerge: false,
          mergeWithBelt: null,
          ageMin: null,
          ageMax: null,
          weightMinGrams: group.weightMinGrams,
          weightMaxGrams: group.weightMaxGrams,
          totalAthletes: group.athleteIds.length,
        }),
        athleteIds: [...group.athleteIds].sort((left, right) => left - right),
      }))
      .sort((left, right) =>
        left.category.name.localeCompare(right.category.name),
      );
  }
}
