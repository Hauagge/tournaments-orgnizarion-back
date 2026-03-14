import { Athlete } from '../../src/domain/athlete/entities/athlete.entity';

export function makeAthlete(overrides: Partial<Athlete> = {}): Athlete {
  return {
    id: 1,
    name: 'Athlete Test',
    age: 16,
    weight: 60,
    beltId: 1,
    categoryId: 1,
    weighInConfirmed: false,
    eligible: null,
    fightBracketId: null,
    tutor: 'Tutor Test',
    subscriptionNumber: 'SUB-0001',
    ...overrides,
  };
}

