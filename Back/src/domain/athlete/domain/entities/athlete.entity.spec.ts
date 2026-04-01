import { describe, expect, it } from 'vitest';
import { Athlete } from './athlete.entity';

describe('Athlete', () => {
  it('should create athlete with normalized full name', () => {
    const athlete = Athlete.create({
      competitionId: 1,
      fullName: '  Ana   Maria  Silva  ',
      birthDate: new Date('2010-05-10T00:00:00.000Z'),
      belt: ' white ',
      declaredWeightGrams: 50200,
      academyId: null,
    });

    expect(athlete.id).toBeUndefined();
    expect(athlete.fullName).toBe('Ana Maria Silva');
    expect(athlete.belt).toBe('white');
    expect(athlete.createdAt).toBeInstanceOf(Date);
  });

  it('should update athlete without mutating previous instance', () => {
    const createdAt = new Date('2026-01-10T00:00:00.000Z');
    const athlete = Athlete.restore({
      id: 10,
      competitionId: 3,
      fullName: 'Ana Silva',
      birthDate: new Date('2010-05-10T00:00:00.000Z'),
      belt: 'gray',
      declaredWeightGrams: 48000,
      academyId: 5,
      createdAt,
    });

    const updated = athlete.update({
      fullName: '  Ana   Clara  Silva ',
      academyId: null,
    });

    expect(athlete.fullName).toBe('Ana Silva');
    expect(updated.toJSON()).toEqual({
      id: 10,
      competitionId: 3,
      fullName: 'Ana Clara Silva',
      birthDate: new Date('2010-05-10T00:00:00.000Z'),
      belt: 'gray',
      declaredWeightGrams: 48000,
      academyId: null,
      createdAt,
    });
  });
});
