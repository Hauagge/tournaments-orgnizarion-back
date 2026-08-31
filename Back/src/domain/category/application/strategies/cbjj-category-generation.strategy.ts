import { Injectable } from '@nestjs/common';
import { Athlete } from '@/domain/athlete/domain/entities/athlete.entity';
import { AthleteGender } from '@/domain/athlete/domain/value-objects/athlete-gender.enum';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { ValidationError } from '@/shared/errors/validation.error';
import { Category } from '../../domain/entities/category.entity';
import {
  CategoryGenerationStrategy,
  GeneratedCategory,
} from './category-generation.strategy';
import {
  findCbjjAgeDivision,
  findCbjjWeightClasses,
} from './cbjj-weight-table';

const GENDER_LABEL: Record<AthleteGender, string> = {
  [AthleteGender.MALE]: 'Masculino',
  [AthleteGender.FEMALE]: 'Feminino',
};

type GroupedCategory = {
  name: string;
  belt: string;
  gender: AthleteGender;
  ageMin: number;
  ageMax: number | null;
  weightMinGrams: number;
  weightMaxGrams: number | null;
  athleteIds: number[];
};

/**
 * Categorias pelas tabelas oficiais: divisao etaria x sexo x faixa x peso.
 * Sem limite de atletas por categoria — o formato da chave e decidido depois,
 * na geracao das lutas.
 */
@Injectable()
export class CbjjCategoryGenerationStrategy extends CategoryGenerationStrategy {
  readonly mode = CompetitionMode.CBJJ;

  generate(competitionId: number, athletes: Athlete[]): GeneratedCategory[] {
    const grouped = new Map<string, GroupedCategory>();
    const unsupportedAthletes: string[] = [];

    for (const athlete of athletes) {
      const athleteId = athlete.id;
      if (!athleteId) {
        continue;
      }

      if (athlete.gender === null) {
        unsupportedAthletes.push(`${athlete.fullName} (sexo nao informado)`);
        continue;
      }

      const age = this.calculateAge(athlete.birthDate);
      const division = findCbjjAgeDivision(age);
      const weightClasses = findCbjjWeightClasses(age, athlete.gender);

      if (!division || !weightClasses) {
        unsupportedAthletes.push(`${athlete.fullName} (${age} anos)`);
        continue;
      }

      const weightKg = athlete.declaredWeight / 1000;
      const weightClass = this.findWeightClass(weightClasses, weightKg);

      if (!weightClass) {
        unsupportedAthletes.push(
          `${athlete.fullName} (${weightKg.toFixed(3)}kg)`,
        );
        continue;
      }

      const key = [
        athlete.belt,
        athlete.gender,
        division.name,
        weightClass.name,
      ].join('|');

      if (!grouped.has(key)) {
        grouped.set(key, {
          name: `${GENDER_LABEL[athlete.gender]} - ${division.name} - ${athlete.belt} - ${weightClass.name}`,
          belt: athlete.belt,
          gender: athlete.gender,
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
      throw new ValidationError(
        'Unable to generate categories for some athletes',
        { athletes: unsupportedAthletes },
      );
    }

    return Array.from(grouped.values())
      .map((group) => ({
        category: Category.create({
          competitionId,
          name: group.name,
          belt: group.belt,
          allowMerge: false,
          mergeWithBelt: null,
          ageMin: group.ageMin,
          ageMax: group.ageMax,
          weightMinGrams: group.weightMinGrams,
          weightMaxGrams: group.weightMaxGrams,
          totalAthletes: group.athleteIds.length,
        }),
        athleteIds: [...group.athleteIds].sort((left, right) => left - right),
      }))
      // Combates comecam pelas categorias de menor idade e avancam em ordem.
      .sort((left, right) => {
        const ageDiff =
          (left.category.ageMin ?? 0) - (right.category.ageMin ?? 0);
        if (ageDiff !== 0) {
          return ageDiff;
        }

        if (left.category.belt !== right.category.belt) {
          return left.category.belt.localeCompare(right.category.belt);
        }

        return (
          (left.category.weightMaxGrams ?? Number.MAX_SAFE_INTEGER) -
          (right.category.weightMaxGrams ?? Number.MAX_SAFE_INTEGER)
        );
      });
  }
}
