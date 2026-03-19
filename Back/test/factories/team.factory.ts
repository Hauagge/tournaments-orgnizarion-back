import { Team } from '../../src/domain/team/domain/entities/team.entity';

export function makeTeam(
  overrides: Partial<ReturnType<Team['toJSON']>> = {},
): Team {
  return Team.restore({
    id: 1,
    competitionId: 1,
    name: 'Team Test',
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
    ...overrides,
  });
}
