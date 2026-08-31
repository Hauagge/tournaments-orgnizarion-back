import { AthleteGender } from '@/domain/athlete/domain/value-objects/athlete-gender.enum';
import { WeightClass } from './category-generation.strategy';

/**
 * Tabelas oficiais (IBJJF/CBJJ, com kimono, em kg). Cada numero e o PESO MAXIMO
 * da classe; a ultima classe de cada tabela nao tem limite.
 *
 * Kids (4 a 15 anos): a tabela e por ano de nascimento e nao separa por sexo —
 * o sexo separa as chaves, nao os pesos. Aqui e indexada por idade, que no
 * criterio da entidade e "ano atual - ano de nascimento", exatamente como a
 * tabela oficial.
 */
const KIDS_CLASS_NAMES = [
  'Galo',
  'Pluma',
  'Pena',
  'Leve',
  'Medio',
  'Meio-Pesado',
  'Pesado',
  'Super-Pesado',
] as const;

const KIDS_MAX_KG_BY_AGE: Record<number, number[]> = {
  4: [12.0, 14.7, 18.0, 21.0, 24.0, 27.0, 30.0, 33.0],
  5: [14.7, 17.9, 20.0, 24.0, 26.0, 29.0, 32.0, 35.0],
  6: [17.9, 18.9, 22.0, 25.0, 28.0, 31.2, 34.2, 37.2],
  7: [18.2, 21.0, 24.0, 27.0, 30.2, 33.2, 36.2, 39.3],
  8: [21.0, 24.0, 27.0, 30.2, 33.2, 36.2, 39.3, 42.3],
  9: [24.0, 27.0, 30.2, 33.2, 36.2, 39.3, 42.3, 45.3],
  10: [27.0, 30.2, 33.2, 36.2, 39.3, 42.3, 45.3, 48.3],
  11: [30.2, 33.2, 36.2, 39.3, 42.3, 45.3, 48.3, 51.5],
  12: [32.2, 36.2, 40.3, 44.3, 48.3, 52.5, 56.5, 60.5],
  13: [36.2, 40.3, 44.3, 48.3, 52.5, 56.5, 60.5, 65.0],
  14: [40.3, 44.3, 48.3, 52.5, 56.5, 60.5, 65.0, 69.0],
  15: [44.3, 48.3, 52.5, 56.5, 60.5, 65.0, 69.0, 73.0],
};

const KIDS_DIVISION_NAME_BY_AGE: Record<number, string> = {
  4: 'Pre-Mirim 1',
  5: 'Pre-Mirim 2',
  6: 'Pre-Mirim 3',
  7: 'Mirim 1',
  8: 'Mirim 2',
  9: 'Mirim 3',
  10: 'Infantil 1',
  11: 'Infantil 2',
  12: 'Infantil 3',
  13: 'Infanto-Juvenil 1',
  14: 'Infanto-Juvenil 2',
  15: 'Infanto-Juvenil 3',
};

const JUVENILE_MAX_KG: Record<AthleteGender, number[]> = {
  [AthleteGender.MALE]: [53.5, 58.5, 64.0, 69.0, 74.0, 79.3, 84.3, 89.3],
  [AthleteGender.FEMALE]: [44.3, 48.3, 52.5, 56.5, 60.5, 65.0, 69.0],
};

const ADULT_MAX_KG: Record<AthleteGender, number[]> = {
  [AthleteGender.MALE]: [57.5, 64.0, 70.0, 76.0, 82.3, 88.3, 94.3, 100.5],
  [AthleteGender.FEMALE]: [48.5, 53.5, 58.5, 64.0, 69.0, 74.0, 79.3],
};

export type CbjjAgeDivision = {
  name: string;
  minAge: number;
  maxAge: number | null;
};

function buildWeightClasses(maxKgByClass: number[]): WeightClass[] {
  const classes: WeightClass[] = [];
  let minKg = 0;

  maxKgByClass.forEach((maxKg, index) => {
    classes.push({ name: KIDS_CLASS_NAMES[index], minKg, maxKg });
    minKg = maxKg;
  });

  // Ultima classe sem limite: Pesadissimo no masculino/kids, Super-Pesado no
  // feminino adulto e juvenil (a tabela oficial nao tem Pesadissimo feminino).
  classes.push({
    name:
      maxKgByClass.length === KIDS_CLASS_NAMES.length
        ? 'Pesadissimo'
        : 'Super-Pesado',
    minKg,
    maxKg: null,
  });

  return classes;
}

export function findCbjjAgeDivision(age: number): CbjjAgeDivision | null {
  if (age >= 4 && age <= 15) {
    return {
      name: KIDS_DIVISION_NAME_BY_AGE[age],
      minAge: age,
      maxAge: age,
    };
  }

  if (age === 16 || age === 17) {
    return { name: 'Juvenil', minAge: 16, maxAge: 17 };
  }

  if (age >= 18) {
    return { name: 'Adulto', minAge: 18, maxAge: null };
  }

  return null;
}

export function findCbjjWeightClasses(
  age: number,
  gender: AthleteGender,
): WeightClass[] | null {
  if (age >= 4 && age <= 15) {
    return buildWeightClasses(KIDS_MAX_KG_BY_AGE[age]);
  }

  if (age === 16 || age === 17) {
    return buildWeightClasses(JUVENILE_MAX_KG[gender]);
  }

  if (age >= 18) {
    return buildWeightClasses(ADULT_MAX_KG[gender]);
  }

  return null;
}
