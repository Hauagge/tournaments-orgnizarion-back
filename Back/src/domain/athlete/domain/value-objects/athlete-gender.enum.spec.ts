import { describe, expect, it } from 'vitest';
import { AthleteGender, parseAthleteGender } from './athlete-gender.enum';

describe('parseAthleteGender', () => {
  it('accepts the spellings used in the spreadsheets', () => {
    expect(parseAthleteGender('M')).toBe(AthleteGender.MALE);
    expect(parseAthleteGender('masculino')).toBe(AthleteGender.MALE);
    expect(parseAthleteGender(' Masculino ')).toBe(AthleteGender.MALE);
    expect(parseAthleteGender('F')).toBe(AthleteGender.FEMALE);
    expect(parseAthleteGender('Feminino')).toBe(AthleteGender.FEMALE);
    expect(parseAthleteGender('FEMALE')).toBe(AthleteGender.FEMALE);
  });

  it('returns null for empty or unknown values', () => {
    expect(parseAthleteGender('')).toBeNull();
    expect(parseAthleteGender('outro')).toBeNull();
    expect(parseAthleteGender(null)).toBeNull();
    expect(parseAthleteGender(undefined)).toBeNull();
  });
});
