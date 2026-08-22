import { describe, expect, it } from 'vitest';
import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';
import { KeyGroupStatus } from '../../domain/value-objects/key-group-status.enum';
import { KeyGroupBracketFormat } from '../../domain/value-objects/key-group-bracket-format.enum';
import { KeyGroupDetailsView } from '../../repository/IKeyGroupRepository.repository';
import { KeyGroupBracketViewBuilderService } from './key-group-bracket-view-builder.service';

function makeDetails(
  overrides: Partial<KeyGroupDetailsView> = {},
): KeyGroupDetailsView {
  return {
    id: 10,
    competitionId: 1,
    categoryId: 1,
    name: 'Chave A',
    status: KeyGroupStatus.READY,
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
    members: [
      {
        id: 1,
        fullName: 'Ana',
        birthDate: new Date('2010-01-01T00:00:00.000Z'),
        belt: 'white',
        declaredWeightGrams: 50000,
        academyName: null,
        weighInStatus: 'APPROVED' as any,
      },
      {
        id: 2,
        fullName: 'Bia',
        birthDate: new Date('2010-01-01T00:00:00.000Z'),
        belt: 'white',
        declaredWeightGrams: 50000,
        academyName: null,
        weighInStatus: 'APPROVED' as any,
      },
    ],
    fights: [],
    ...overrides,
  };
}

function makeFight(input: {
  id: number;
  athleteAId: number;
  athleteBId: number;
  winnerAthleteId?: number | null;
  orderIndex?: number;
  status?: FightStatus;
  keyGroupId?: number;
}) {
  return {
    id: input.id,
    keyGroupId: input.keyGroupId ?? 10,
    areaId: null,
    areaName: null,
    athleteAId: input.athleteAId,
    athleteAName: input.athleteAId === 1 ? 'Ana' : 'Bia',
    athleteABirthDate: null,
    athleteBId: input.athleteBId,
    athleteBName: input.athleteBId === 1 ? 'Ana' : 'Bia',
    athleteBBirthDate: null,
    status: input.status ?? FightStatus.WAITING,
    winnerAthleteId: input.winnerAthleteId ?? null,
    winType: null,
    orderIndex: input.orderIndex ?? input.id,
  };
}

describe('KeyGroupBracketViewBuilderService', () => {
  const service = new KeyGroupBracketViewBuilderService();

  it('builds a best-of-three view with a disabled virtual third fight before a 1x1 score', () => {
    const details = makeDetails({
      fights: [
        makeFight({
          id: 1,
          athleteAId: 1,
          athleteBId: 2,
          winnerAthleteId: 1,
          status: FightStatus.FINISHED,
          orderIndex: 1,
        }),
        makeFight({
          id: 2,
          athleteAId: 1,
          athleteBId: 2,
          status: FightStatus.WAITING,
          orderIndex: 2,
        }),
      ],
    });

    const result = service.build(details);

    expect(result.bracketFormat).toBe(KeyGroupBracketFormat.BEST_OF_THREE);
    expect(result.phases).toEqual([
      {
        phase: 'Best of 3',
        round: 1,
        order: 1,
        fights: [
          expect.objectContaining({ id: 1, enabled: true, orderIndex: 1 }),
          expect.objectContaining({ id: 2, enabled: true, orderIndex: 2 }),
          expect.objectContaining({
            id: null,
            enabled: false,
            orderIndex: 3,
            athleteAId: 1,
            athleteBId: 2,
          }),
        ],
      },
    ]);
  });

  it('builds round-robin standings deterministically', () => {
    const details = makeDetails({
      members: [
        ...makeDetails().members,
        {
          id: 3,
          fullName: 'Caio',
          birthDate: new Date('2010-01-01T00:00:00.000Z'),
          belt: 'white',
          declaredWeightGrams: 50000,
          academyName: null,
          weighInStatus: 'APPROVED' as any,
        },
      ],
      fights: [
        makeFight({
          id: 1,
          athleteAId: 1,
          athleteBId: 2,
          winnerAthleteId: 1,
          status: FightStatus.FINISHED,
        }),
        makeFight({
          id: 2,
          athleteAId: 1,
          athleteBId: 3,
          winnerAthleteId: 3,
          status: FightStatus.FINISHED,
        }),
        makeFight({
          id: 3,
          athleteAId: 2,
          athleteBId: 3,
          status: FightStatus.WAITING,
        }),
      ],
    });

    const result = service.build(details);

    expect(result.bracketFormat).toBe(KeyGroupBracketFormat.ROUND_ROBIN);
    expect(result.standings).toEqual([
      { athleteId: 3, athleteName: 'Caio', wins: 1, losses: 0, points: 3 },
      { athleteId: 1, athleteName: 'Ana', wins: 1, losses: 1, points: 3 },
      { athleteId: 2, athleteName: 'Bia', wins: 0, losses: 1, points: 0 },
    ]);
  });
});
