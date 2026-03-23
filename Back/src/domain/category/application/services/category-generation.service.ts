import { Injectable } from '@nestjs/common';
import { Athlete } from '@/domain/athlete/domain/entities/athlete.entity';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { ValidationError } from '@/shared/errors/validation.error';
import { Category } from '../../domain/entities/category.entity';

type GeneratedCategory = {
  category: Category;
  athleteIds: number[];
};

type WeightClass = {
  name: string;
  minKg: number;
  maxKg: number | null;
};

type TeamDivision = {
  name: string;
  minAge: number;
  maxAge: number;
  weightClasses: WeightClass[];
};

const TEAM_DIVISIONS: TeamDivision[] = [
  {
    name: 'Mirim',
    minAge: 4,
    maxAge: 7,
    weightClasses: [
      { name: 'Galo', minKg: 15, maxKg: 18 },
      { name: 'Pluma', minKg: 19, maxKg: 21 },
      { name: 'Pena', minKg: 22, maxKg: 24 },
      { name: 'Leve', minKg: 25, maxKg: 27 },
      { name: 'Medio', minKg: 28, maxKg: 30 },
      { name: 'Meio-pesado', minKg: 31, maxKg: 33 },
      { name: 'Pesado', minKg: 34, maxKg: 36 },
      { name: 'Super-pesado', minKg: 37, maxKg: 39 },
      { name: 'Pesadissimo A', minKg: 40, maxKg: 42 },
      { name: 'Pesadissimo B', minKg: 43, maxKg: 45 },
      { name: 'Pesadissimo C', minKg: 46, maxKg: null },
    ],
  },
  {
    name: 'Infantil A',
    minAge: 8,
    maxAge: 9,
    weightClasses: [
      { name: 'Galo', minKg: 20, maxKg: 24 },
      { name: 'Pluma', minKg: 25, maxKg: 27 },
      { name: 'Pena', minKg: 28, maxKg: 30 },
      { name: 'Leve', minKg: 31, maxKg: 33 },
      { name: 'Medio', minKg: 34, maxKg: 36 },
      { name: 'Meio-pesado', minKg: 37, maxKg: 39 },
      { name: 'Pesado', minKg: 40, maxKg: 42 },
      { name: 'Super-pesado', minKg: 43, maxKg: 45 },
      { name: 'Pesadissimo A', minKg: 46, maxKg: 48 },
      { name: 'Pesadissimo B', minKg: 49, maxKg: 51 },
      { name: 'Pesadissimo C', minKg: 52, maxKg: null },
    ],
  },
  {
    name: 'Infantil B',
    minAge: 10,
    maxAge: 11,
    weightClasses: [
      { name: 'Galo', minKg: 29, maxKg: 32 },
      { name: 'Pluma', minKg: 33, maxKg: 36 },
      { name: 'Pena', minKg: 37, maxKg: 39 },
      { name: 'Leve', minKg: 40, maxKg: 43 },
      { name: 'Medio', minKg: 44, maxKg: 46 },
      { name: 'Meio-pesado', minKg: 47, maxKg: 49 },
      { name: 'Pesado', minKg: 50, maxKg: 52 },
      { name: 'Super-pesado', minKg: 53, maxKg: 55 },
      { name: 'Pesadissimo A', minKg: 56, maxKg: 58 },
      { name: 'Pesadissimo B', minKg: 59, maxKg: 61 },
      { name: 'Pesadissimo C', minKg: 62, maxKg: null },
    ],
  },
  {
    name: 'Infanto Juvenil A',
    minAge: 12,
    maxAge: 13,
    weightClasses: [
      { name: 'Galo', minKg: 32, maxKg: 35 },
      { name: 'Pluma', minKg: 36, maxKg: 39 },
      { name: 'Pena', minKg: 40, maxKg: 43 },
      { name: 'Leve', minKg: 44, maxKg: 47 },
      { name: 'Medio', minKg: 48, maxKg: 51 },
      { name: 'Meio-pesado', minKg: 52, maxKg: 55 },
      { name: 'Pesado', minKg: 56, maxKg: 59 },
      { name: 'Super-pesado', minKg: 60, maxKg: 63 },
      { name: 'Pesadissimo A', minKg: 64, maxKg: 67 },
      { name: 'Pesadissimo B', minKg: 68, maxKg: 71 },
      { name: 'Pesadissimo C', minKg: 72, maxKg: null },
    ],
  },
  {
    name: 'Infanto Juvenil B',
    minAge: 14,
    maxAge: 15,
    weightClasses: [
      { name: 'Galo', minKg: 36, maxKg: 39 },
      { name: 'Pluma', minKg: 40, maxKg: 43 },
      { name: 'Pena', minKg: 44, maxKg: 47 },
      { name: 'Leve', minKg: 48, maxKg: 51 },
      { name: 'Medio', minKg: 52, maxKg: 55 },
      { name: 'Meio-pesado', minKg: 56, maxKg: 59 },
      { name: 'Pesado', minKg: 60, maxKg: 63 },
      { name: 'Super-pesado', minKg: 64, maxKg: 67 },
      { name: 'Pesadissimo A', minKg: 68, maxKg: 71 },
      { name: 'Pesadissimo B', minKg: 72, maxKg: 75 },
      { name: 'Pesadissimo C', minKg: 76, maxKg: null },
    ],
  },
  {
    name: 'Juvenil',
    minAge: 16,
    maxAge: 17,
    weightClasses: [
      { name: 'Galo', minKg: 50, maxKg: 54 },
      { name: 'Pluma', minKg: 55, maxKg: 59 },
      { name: 'Pena', minKg: 60, maxKg: 64 },
      { name: 'Leve', minKg: 65, maxKg: 68 },
      { name: 'Medio', minKg: 69, maxKg: 72 },
      { name: 'Meio-pesado', minKg: 73, maxKg: 76 },
      { name: 'Pesado', minKg: 77, maxKg: 81 },
      { name: 'Super-pesado', minKg: 82, maxKg: 85 },
      { name: 'Pesadissimo A', minKg: 86, maxKg: 90 },
      { name: 'Pesadissimo B', minKg: 91, maxKg: 95 },
      { name: 'Pesadissimo C', minKg: 96, maxKg: null },
    ],
  },
];

const ABSOLUTE_GP_WEIGHT_CLASSES: WeightClass[] = [
  { name: 'Ate 80kg', minKg: 0, maxKg: 80 },
  { name: 'Acima de 80kg', minKg: 80.001, maxKg: null },
];

@Injectable()
export class CategoryGenerationService {
  generate(
    competitionId: number,
    mode: CompetitionMode,
    athletes: Athlete[],
  ): GeneratedCategory[] {
    return mode === CompetitionMode.ABSOLUTE_GP
      ? this.generateAbsoluteGpCategories(competitionId, athletes)
      : this.generateTeamCategories(competitionId, athletes);
  }

  private generateTeamCategories(
    competitionId: number,
    athletes: Athlete[],
  ): GeneratedCategory[] {
    const grouped = new Map<
      string,
      {
        name: string;
        belt: string;
        ageMin: number;
        ageMax: number;
        weightMinGrams: number;
        weightMaxGrams: number | null;
        athleteIds: number[];
      }
    >();
    const unsupportedAthletes: string[] = [];

    for (const athlete of athletes) {
      const athleteId = athlete.id;
      if (!athleteId) {
        continue;
      }

      const age = this.calculateAge(athlete.birthDate);
      const division = TEAM_DIVISIONS.find(
        (item) => age >= item.minAge && age <= item.maxAge,
      );

      if (!division) {
        unsupportedAthletes.push(`${athlete.fullName} (${age} anos)`);
        continue;
      }

      const weightKg = athlete.declaredWeightGrams / 1000;
      const weightClass = this.findWeightClass(division.weightClasses, weightKg);

      if (!weightClass) {
        unsupportedAthletes.push(`${athlete.fullName} (${weightKg.toFixed(3)}kg)`);
        continue;
      }

      const key = [athlete.belt, division.name, weightClass.name].join('|');

      if (!grouped.has(key)) {
        grouped.set(key, {
          name: `${athlete.belt} - ${division.name} - ${weightClass.name}`,
          belt: athlete.belt,
          ageMin: division.minAge,
          ageMax: division.maxAge,
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

    if (unsupportedAthletes.length > 0) {
      throw new ValidationError('Unable to generate categories for some athletes', {
        athletes: unsupportedAthletes,
      });
    }

    return Array.from(grouped.values())
      .map((group) => ({
        category: Category.create({
          competitionId,
          name: group.name,
          belt: group.belt,
          ageMin: group.ageMin,
          ageMax: group.ageMax,
          weightMinGrams: group.weightMinGrams,
          weightMaxGrams: group.weightMaxGrams,
          totalAthletes: group.athleteIds.length,
        }),
        athleteIds: [...group.athleteIds].sort((left, right) => left - right),
      }))
      .sort((left, right) => {
        if (left.category.ageMin !== right.category.ageMin) {
          return (left.category.ageMin ?? 0) - (right.category.ageMin ?? 0);
        }

        if (left.category.belt !== right.category.belt) {
          return left.category.belt.localeCompare(right.category.belt);
        }

        return left.category.name.localeCompare(right.category.name);
      });
  }

  private generateAbsoluteGpCategories(
    competitionId: number,
    athletes: Athlete[],
  ): GeneratedCategory[] {
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

      const weightKg = athlete.declaredWeightGrams / 1000;
      const weightClass = this.findWeightClass(ABSOLUTE_GP_WEIGHT_CLASSES, weightKg);

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
          ageMin: null,
          ageMax: null,
          weightMinGrams: group.weightMinGrams,
          weightMaxGrams: group.weightMaxGrams,
          totalAthletes: group.athleteIds.length,
        }),
        athleteIds: [...group.athleteIds].sort((left, right) => left - right),
      }))
      .sort((left, right) => left.category.name.localeCompare(right.category.name));
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age -= 1;
    }

    return age;
  }

  private findWeightClass(
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
