import { describe, expect, it } from 'vitest';
import { AthleteGender } from '@/domain/athlete/domain/value-objects/athlete-gender.enum';
import {
  findCbjjAgeDivision,
  findCbjjWeightClasses,
} from './cbjj-weight-table';

describe('cbjj weight table', () => {
  it('maps ages to the official divisions', () => {
    expect(findCbjjAgeDivision(4)?.name).toBe('Pre-Mirim 1');
    expect(findCbjjAgeDivision(9)?.name).toBe('Mirim 3');
    expect(findCbjjAgeDivision(12)?.name).toBe('Infantil 3');
    expect(findCbjjAgeDivision(15)?.name).toBe('Infanto-Juvenil 3');
    expect(findCbjjAgeDivision(16)?.name).toBe('Juvenil');
    expect(findCbjjAgeDivision(45)?.name).toBe('Adulto');
    expect(findCbjjAgeDivision(3)).toBeNull();
  });

  it('uses the same kids weights for both genders', () => {
    const male = findCbjjWeightClasses(10, AthleteGender.MALE);
    const female = findCbjjWeightClasses(10, AthleteGender.FEMALE);

    expect(male).toEqual(female);
    expect(male?.[0]).toEqual({ name: 'Galo', minKg: 0, maxKg: 27.0 });
    expect(male?.[7]).toEqual({
      name: 'Super-Pesado',
      minKg: 45.3,
      maxKg: 48.3,
    });
  });

  it('closes every table with an open ended class', () => {
    const adultMale = findCbjjWeightClasses(30, AthleteGender.MALE);
    const adultFemale = findCbjjWeightClasses(30, AthleteGender.FEMALE);

    expect(adultMale?.at(-1)).toEqual({
      name: 'Pesadissimo',
      minKg: 100.5,
      maxKg: null,
    });
    expect(adultFemale?.at(-1)).toEqual({
      name: 'Super-Pesado',
      minKg: 79.3,
      maxKg: null,
    });
  });

  it('uses the juvenile table for 16 and 17 years old', () => {
    const juvenileMale = findCbjjWeightClasses(17, AthleteGender.MALE);
    const juvenileFemale = findCbjjWeightClasses(16, AthleteGender.FEMALE);

    expect(juvenileMale?.[0].maxKg).toBe(53.5);
    expect(juvenileFemale?.[0].maxKg).toBe(44.3);
  });
});
