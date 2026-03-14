import { Fight } from '../../src/domain/fight/entities/fight.entinty';

export function makeFight(overrides: Partial<Fight> = {}): Fight {
  return {
    id: 1,
    athlete1Id: 1,
    athlete2Id: 2,
    bracketId: 1,
    winnerId: null,
    athlete1Score: 0,
    athlete2Score: 0,
    athlete1Penalty: 0,
    athlete2Penalty: 0,
    isSubmission: false,
    ...overrides,
  };
}

