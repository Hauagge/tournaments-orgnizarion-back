import { describe, expect, it } from 'vitest';
import { FightEntity } from '@/domain/fight/domain/entities/fight.entity';
import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';
import { KeyGroupChampionService } from './key-group-champion.service';

function makeFight(
  overrides: Partial<Parameters<typeof FightEntity.restore>[0]> = {},
) {
  return FightEntity.restore({
    id: 1,
    competitionId: 1,
    categoryId: null,
    keyGroupId: 8,
    round: 1,
    order: 1,
    areaId: null,
    areaName: null,
    status: FightStatus.FINISHED,
    athleteAId: 10,
    athleteBId: 20,
    winnerId: 10,
    winType: 'POINTS',
    startedAt: null,
    finishedAt: null,
    ...overrides,
  });
}

describe('KeyGroupChampionService', () => {
  const service = new KeyGroupChampionService();

  it('uses the final winner on bracket key groups', () => {
    const champion = service.resolve([
      makeFight({ id: 1, round: 1, order: 1, winnerId: 10 }),
      makeFight({
        id: 2,
        round: 1,
        order: 2,
        athleteAId: 30,
        athleteBId: 40,
        winnerId: 40,
      }),
      makeFight({
        id: 3,
        round: 2,
        order: 3,
        athleteAId: 10,
        athleteBId: 40,
        winnerId: 40,
      }),
    ]);

    expect(champion).toBe(40);
  });

  it('returns null while the key group still has open fights', () => {
    const champion = service.resolve([
      makeFight({ id: 1, round: 1, order: 1, winnerId: 10 }),
      makeFight({
        id: 2,
        round: 1,
        order: 2,
        status: FightStatus.IN_PROGRESS,
        winnerId: null,
      }),
    ]);

    expect(champion).toBeNull();
  });

  it('uses the win count on best of three key groups', () => {
    const champion = service.resolve([
      makeFight({ id: 1, order: 1, winnerId: 10 }),
      makeFight({ id: 2, order: 2, winnerId: 20 }),
      makeFight({ id: 3, order: 3, winnerId: 20 }),
    ]);

    expect(champion).toBe(20);
  });

  it('uses the win count on round robin key groups', () => {
    const champion = service.resolve([
      makeFight({ id: 1, order: 1, athleteAId: 10, athleteBId: 20, winnerId: 20 }),
      makeFight({ id: 2, order: 2, athleteAId: 10, athleteBId: 30, winnerId: 10 }),
      makeFight({ id: 3, order: 3, athleteAId: 20, athleteBId: 30, winnerId: 20 }),
    ]);

    expect(champion).toBe(20);
  });

  it('returns null when the round robin ends tied', () => {
    const champion = service.resolve([
      makeFight({ id: 1, order: 1, athleteAId: 10, athleteBId: 20, winnerId: 10 }),
      makeFight({ id: 2, order: 2, athleteAId: 20, athleteBId: 30, winnerId: 20 }),
      makeFight({ id: 3, order: 3, athleteAId: 30, athleteBId: 10, winnerId: 30 }),
    ]);

    expect(champion).toBeNull();
  });

  it('ignores canceled fights', () => {
    const champion = service.resolve([
      makeFight({ id: 1, order: 1, winnerId: 10 }),
      makeFight({
        id: 2,
        order: 2,
        status: FightStatus.CANCELED,
        winnerId: null,
      }),
    ]);

    expect(champion).toBe(10);
  });
});
