import { FightTypeOrmEntity } from '../../src/domain/fight/entities/fight.typeorm-entity';

export function makeFight(
  overrides: Partial<FightTypeOrmEntity> = {},
): FightTypeOrmEntity {
  return {
    id: 1,
    competitionId: 1,
    categoryId: 1,
    keyGroupId: null,
    round: 1,
    order: 1,
    areaId: null,
    status: 'PENDING' as any,
    athleteAId: 1,
    athleteBId: 2,
    winnerId: null,
    loserId: null,
    nextFightId: null,
    nextFightSlot: null,
    createdManually: false,
    isWo: false,
    winType: null,
    startedAt: null,
    finishedAt: null,
    area: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
