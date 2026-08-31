import { describe, expect, it } from 'vitest';
import { AthleteGender } from '@/domain/athlete/domain/value-objects/athlete-gender.enum';
import { ValidationError } from '@/shared/errors/validation.error';
import { makeAthlete } from '../../../../../test/factories/athlete.factory';
import { CbjjCategoryGenerationStrategy } from './cbjj-category-generation.strategy';

const CURRENT_YEAR = new Date().getFullYear();

function birthDateForAge(age: number) {
  return new Date(`${CURRENT_YEAR - age}-05-10T00:00:00.000Z`);
}

describe('CbjjCategoryGenerationStrategy', () => {
  const strategy = new CbjjCategoryGenerationStrategy();

  it('separates athletes by age division, gender, belt and weight class', () => {
    const generated = strategy.generate(1, [
      makeAthlete({
        id: 1,
        fullName: 'Menino Leve',
        belt: 'branca',
        gender: AthleteGender.MALE,
        birthDate: birthDateForAge(10),
        declaredWeight: 35000,
      }),
      makeAthlete({
        id: 2,
        fullName: 'Menina Leve',
        belt: 'branca',
        gender: AthleteGender.FEMALE,
        birthDate: birthDateForAge(10),
        declaredWeight: 35000,
      }),
      makeAthlete({
        id: 3,
        fullName: 'Adulto Pena',
        belt: 'azul',
        gender: AthleteGender.MALE,
        birthDate: birthDateForAge(25),
        declaredWeight: 68000,
      }),
    ]);

    expect(generated).toHaveLength(3);
    expect(generated[0].category.name).toBe(
      'Masculino - Infantil 1 - branca - Leve',
    );
    expect(generated[1].category.name).toBe(
      'Feminino - Infantil 1 - branca - Leve',
    );
    expect(generated[2].category.name).toBe('Masculino - Adulto - azul - Pena');
    expect(generated[2].category.weightMaxGrams).toBe(70000);
  });

  it('keeps every athlete of the same category together, without limit', () => {
    const athletes = Array.from({ length: 12 }, (_, index) =>
      makeAthlete({
        id: index + 1,
        belt: 'branca',
        gender: AthleteGender.MALE,
        birthDate: birthDateForAge(25),
        declaredWeight: 68000,
      }),
    );

    const generated = strategy.generate(1, athletes);

    expect(generated).toHaveLength(1);
    expect(generated[0].athleteIds).toHaveLength(12);
    expect(generated[0].category.totalAthletes).toBe(12);
  });

  it('puts the heaviest athletes in the open ended class', () => {
    const generated = strategy.generate(1, [
      makeAthlete({
        id: 1,
        belt: 'preta',
        gender: AthleteGender.MALE,
        birthDate: birthDateForAge(30),
        declaredWeight: 120000,
      }),
      makeAthlete({
        id: 2,
        belt: 'preta',
        gender: AthleteGender.FEMALE,
        birthDate: birthDateForAge(30),
        declaredWeight: 95000,
      }),
    ]);

    expect(generated[0].category.name).toContain('Pesadissimo');
    expect(generated[0].category.weightMaxGrams).toBeNull();
    expect(generated[1].category.name).toContain('Super-Pesado');
    expect(generated[1].category.weightMaxGrams).toBeNull();
  });

  it('orders categories from the youngest division upwards', () => {
    const generated = strategy.generate(1, [
      makeAthlete({
        id: 1,
        belt: 'azul',
        gender: AthleteGender.MALE,
        birthDate: birthDateForAge(25),
        declaredWeight: 68000,
      }),
      makeAthlete({
        id: 2,
        belt: 'branca',
        gender: AthleteGender.MALE,
        birthDate: birthDateForAge(7),
        declaredWeight: 20000,
      }),
      makeAthlete({
        id: 3,
        belt: 'branca',
        gender: AthleteGender.MALE,
        birthDate: birthDateForAge(16),
        declaredWeight: 60000,
      }),
    ]);

    expect(generated.map((item) => item.category.ageMin)).toEqual([7, 16, 18]);
  });

  it('rejects athletes without gender', () => {
    expect(() =>
      strategy.generate(1, [
        makeAthlete({
          id: 1,
          fullName: 'Sem Sexo',
          gender: null,
          birthDate: birthDateForAge(25),
          declaredWeight: 68000,
        }),
      ]),
    ).toThrowError(ValidationError);
  });

  it('rejects athletes younger than the official table', () => {
    expect(() =>
      strategy.generate(1, [
        makeAthlete({
          id: 1,
          gender: AthleteGender.MALE,
          birthDate: birthDateForAge(3),
          declaredWeight: 15000,
        }),
      ]),
    ).toThrowError(ValidationError);
  });
});
