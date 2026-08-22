import { describe, expect, it } from 'vitest';
import { FightEntity } from '../../domain/entities/fight.entity';
import { FightStatus } from '../../domain/value-objects/fight-status.enum';
import { BestOfThreeProgressionService } from './best-of-three-progression.service';

function makeFight(input: {
  id: number;
  athleteAId: number;
  athleteBId: number;
  winnerId?: number | null;
  status?: FightStatus;
  orderIndex?: number;
}) {
  return FightEntity.restore({
    id: input.id,
    competitionId: 1,
    categoryId: 10,
    keyGroupId: 20,
    areaId: 3,
    areaName: 'Area 3',
    status: input.status ?? FightStatus.FINISHED,
    athleteAId: input.athleteAId,
    athleteBId: input.athleteBId,
    winnerAthleteId: input.winnerId ?? null,
    loserId:
      input.winnerId === input.athleteAId
        ? input.athleteBId
        : input.winnerId === input.athleteBId
          ? input.athleteAId
          : null,
    winType: null,
    startedAt: null,
    finishedAt: input.status === FightStatus.WAITING ? null : new Date(),
    orderIndex: input.orderIndex ?? input.id,
  });
}

describe('BestOfThreeProgressionService', () => {
  const service = new BestOfThreeProgressionService();

  it('requests the third fight only after two finished fights split 1x1', () => {
    const fights = [
      makeFight({ id: 1, athleteAId: 101, athleteBId: 102, winnerId: 101 }),
      makeFight({ id: 2, athleteAId: 101, athleteBId: 102, winnerId: 102 }),
    ];

    expect(service.shouldCreateThirdFight(fights)).toBe(true);
  });

  it('does not request a third fight after a 2x0 result', () => {
    const fights = [
      makeFight({ id: 1, athleteAId: 101, athleteBId: 102, winnerId: 101 }),
      makeFight({ id: 2, athleteAId: 101, athleteBId: 102, winnerId: 101 }),
    ];

    expect(service.shouldCreateThirdFight(fights)).toBe(false);
  });

  it('does not request a third fight when it already exists', () => {
    const fights = [
      makeFight({ id: 1, athleteAId: 101, athleteBId: 102, winnerId: 101 }),
      makeFight({ id: 2, athleteAId: 101, athleteBId: 102, winnerId: 102 }),
      makeFight({
        id: 3,
        athleteAId: 101,
        athleteBId: 102,
        status: FightStatus.WAITING,
        orderIndex: 3,
      }),
    ];

    expect(service.shouldCreateThirdFight(fights)).toBe(false);
  });
});
