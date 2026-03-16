import { describe, expect, it } from 'vitest';
import { Competition } from './competition.entity';
import { CompetitionMode } from '../value-objects/competition-mode.enum';

describe('Competition', () => {
  it('should create a competition with generated createdAt', () => {
    const competition = Competition.create({
      name: 'Summer Cup',
      mode: CompetitionMode.TEAM,
      fightDurationSeconds: 300,
      weighInMarginGrams: 500,
      ageSplitYears: 2,
    });

    expect(competition.id).toBeUndefined();
    expect(competition.name).toBe('Summer Cup');
    expect(competition.mode).toBe(CompetitionMode.TEAM);
    expect(competition.fightDurationSeconds).toBe(300);
    expect(competition.weighInMarginGrams).toBe(500);
    expect(competition.ageSplitYears).toBe(2);
    expect(competition.createdAt).toBeInstanceOf(Date);
  });

  it('should restore and update settings without mutating previous instance', () => {
    const createdAt = new Date('2026-01-10T00:00:00.000Z');
    const competition = Competition.restore({
      id: 10,
      name: 'Original Cup',
      mode: CompetitionMode.TEAM,
      fightDurationSeconds: 300,
      weighInMarginGrams: 500,
      ageSplitYears: 2,
      createdAt,
    });

    const updated = competition.updateSettings({
      name: 'Updated Cup',
      mode: CompetitionMode.ABSOLUTE_GP,
      fightDurationSeconds: 600,
      weighInMarginGrams: 1000,
      ageSplitYears: 4,
    });

    expect(competition.name).toBe('Original Cup');
    expect(updated.toJSON()).toEqual({
      id: 10,
      name: 'Updated Cup',
      mode: CompetitionMode.ABSOLUTE_GP,
      fightDurationSeconds: 600,
      weighInMarginGrams: 1000,
      ageSplitYears: 4,
      createdAt,
    });
  });
});
