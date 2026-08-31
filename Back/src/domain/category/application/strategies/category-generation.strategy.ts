import { Athlete } from '@/domain/athlete/domain/entities/athlete.entity';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { Category } from '../../domain/entities/category.entity';

export type GeneratedCategory = {
  category: Category;
  athleteIds: number[];
};

export type WeightClass = {
  name: string;
  minKg: number;
  maxKg: number | null;
};

export abstract class CategoryGenerationStrategy {
  abstract readonly mode: CompetitionMode;
  abstract generate(
    competitionId: number,
    athletes: Athlete[],
  ): GeneratedCategory[];

  protected calculateAge(birthDate: Date): number {

    return new Date().getFullYear() - birthDate.getFullYear();
  }

  protected findWeightClass(
    weightClasses: WeightClass[],
    weightKg: number,
  ): WeightClass | null {
    return (
      weightClasses.find(
        (item) =>
          weightKg >= item.minKg &&
          (item.maxKg === null || weightKg <= item.maxKg),
      ) ?? null
    );
  }
}
