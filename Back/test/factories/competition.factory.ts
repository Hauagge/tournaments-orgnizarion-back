import { Competition } from '../../src/domain/competition/domain/entities/competition.entity';
import { CompetitionMode } from '../../src/domain/competition/domain/value-objects/competition-mode.enum';

export function makeCompetition(
  overrides: Partial<ReturnType<Competition['toJSON']>> = {},
): Competition {
  return Competition.restore({
    id: 1,
    name: 'Competition Test',
    mode: CompetitionMode.TEAM,
    fightDurationSeconds: 300,
    weighInMarginGrams: 500,
    ageSplitYears: 2,
    lockTeamsAfterWeighInStarts: false,
    createdAt: new Date('2026-01-10T00:00:00.000Z'),

    ...overrides,
  });
}
