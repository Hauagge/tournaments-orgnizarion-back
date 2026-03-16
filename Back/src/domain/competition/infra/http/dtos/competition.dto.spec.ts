import { describe, expect, it } from 'vitest';
import { CompetitionMode } from '../../../domain/value-objects/competition-mode.enum';
import { CompetitionIdParamSchema } from './competition-id-param.dto';
import { CreateCompetitionSchema } from './create-competition.dto';
import { ListCompetitionsSchema } from './list-competitions.dto';
import { UpdateCompetitionSettingsSchema } from './update-competition-settings.dto';

describe('Competition DTO schemas', () => {
  it('should validate create payload', () => {
    const result = CreateCompetitionSchema.parse({
      name: 'Summer Cup',
      mode: CompetitionMode.TEAM,
      fightDurationSeconds: '300',
      weighInMarginGrams: '500',
      ageSplitYears: '2',
    });

    expect(result).toEqual({
      name: 'Summer Cup',
      mode: CompetitionMode.TEAM,
      fightDurationSeconds: 300,
      weighInMarginGrams: 500,
      ageSplitYears: 2,
    });
  });

  it('should validate update payload', () => {
    const result = UpdateCompetitionSettingsSchema.parse({
      fightDurationSeconds: '600',
    });

    expect(result).toEqual({
      fightDurationSeconds: 600,
    });
  });

  it('should reject empty update payload', () => {
    const result = UpdateCompetitionSettingsSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it('should validate competition id param', () => {
    const result = CompetitionIdParamSchema.parse({
      id: '10',
    });

    expect(result).toEqual({ id: 10 });
  });

  it('should validate list competitions query with defaults', () => {
    const result = ListCompetitionsSchema.parse({});

    expect(result).toEqual({
      page: 1,
      pageSize: 10,
    });
  });
});
