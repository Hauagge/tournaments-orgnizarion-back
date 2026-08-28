import { beforeEach, describe, expect, it } from 'vitest';
import { FightEntity } from '@/domain/fight/domain/entities/fight.entity';
import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { makeAthlete } from '../../../../../test/factories/athlete.factory';
import { makeCompetition } from '../../../../../test/factories/competition.factory';
import {
  InMemoryAreaQueueItemRepository,
  InMemoryAthleteRepository,
  InMemoryCompetitionRepository,
  InMemoryFightRepository,
} from '../../../../../test/repositories/in-memory';
import { Area } from '../../domain/entities/area.entity';
import { AreaQueueItem } from '../../domain/entities/area-queue-item.entity';
import { AreaQueueItemStatus } from '../../domain/value-objects/area-queue-item-status.enum';
import { IAreaRepository } from '../../repository/IAreaRepository.repository';
import { ListAreasByCompetitionUseCase } from './list-areas-by-competition.use-case';

class InMemoryAreaRepository implements IAreaRepository {
  constructor(private areas: Area[] = []) {}

  async createMany(areas: Area[]): Promise<Area[]> {
    this.areas = [...this.areas, ...areas];
    return areas;
  }

  async findById(id: number): Promise<Area | null> {
    return this.areas.find((area) => area.id === id) ?? null;
  }

  async listByCompetitionId(competitionId: number): Promise<Area[]> {
    return this.areas.filter((area) => area.competitionId === competitionId);
  }
}

function makeFight(
  overrides: Partial<Parameters<typeof FightEntity.restore>[0]> = {},
) {
  return FightEntity.restore({
    id: 1,
    competitionId: 1,
    categoryId: 1,
    keyGroupId: null,
    round: 1,
    order: 1,
    areaId: 5,
    areaName: null,
    status: FightStatus.PENDING,
    athleteAId: 10,
    athleteBId: 20,
    winType: null,
    startedAt: null,
    finishedAt: null,
    ...overrides,
  });
}

function makeQueueItem(
  overrides: Partial<Parameters<typeof AreaQueueItem.restore>[0]> = {},
) {
  return AreaQueueItem.restore({
    id: 1,
    areaId: 5,
    fightId: 1,
    position: 1,
    status: AreaQueueItemStatus.QUEUED,
    ...overrides,
  });
}

describe('ListAreasByCompetitionUseCase', () => {
  let competitionRepository: InMemoryCompetitionRepository;
  let areaRepository: InMemoryAreaRepository;
  let athleteRepository: InMemoryAthleteRepository;

  beforeEach(() => {
    competitionRepository = new InMemoryCompetitionRepository([
      makeCompetition({ id: 1 }),
    ]);
    areaRepository = new InMemoryAreaRepository([
      Area.restore({
        id: 5,
        competitionId: 1,
        name: 'Area 1',
        order: 1,
        createdAt: new Date('2026-01-10T00:00:00.000Z'),
      }),
    ]);
    athleteRepository = new InMemoryAthleteRepository([
      makeAthlete({ id: 10, fullName: 'Atleta A' }),
      makeAthlete({ id: 20, fullName: 'Atleta B' }),
      makeAthlete({ id: 30, fullName: 'Atleta C' }),
      makeAthlete({ id: 40, fullName: 'Atleta D' }),
    ]);
  });

  function buildUseCase(input: {
    fights: FightEntity[];
    queueItems: AreaQueueItem[];
  }) {
    return new ListAreasByCompetitionUseCase(
      competitionRepository,
      areaRepository,
      new InMemoryAreaQueueItemRepository(input.queueItems),
      new InMemoryFightRepository(input.fights),
      athleteRepository,
    );
  }

  it('orders the area fights by queue position, not by bracket order', async () => {
    const useCase = buildUseCase({
      fights: [
        makeFight({ id: 1, order: 1 }),
        makeFight({ id: 2, order: 2, athleteAId: 30, athleteBId: 40 }),
      ],
      queueItems: [
        makeQueueItem({ id: 1, fightId: 1, position: 2 }),
        makeQueueItem({ id: 2, fightId: 2, position: 1 }),
      ],
    });

    const [area] = await useCase.execute(1);

    expect(area.queue?.map((fight) => fight.fightId)).toEqual([2, 1]);
    expect(area.next?.fightId).toBe(2);
  });

  it('puts fights without a queue item at the end', async () => {
    const useCase = buildUseCase({
      fights: [
        makeFight({ id: 1, order: 1, athleteAId: 30, athleteBId: 40 }),
        makeFight({ id: 2, order: 2 }),
      ],
      queueItems: [makeQueueItem({ id: 1, fightId: 2, position: 7 })],
    });

    const [area] = await useCase.execute(1);

    expect(area.fights?.map((fight) => fight.fightId)).toEqual([2, 1]);
  });

  it('exposes the called fight as the current one and keeps it out of the queue', async () => {
    const useCase = buildUseCase({
      fights: [
        makeFight({ id: 1, order: 1, status: FightStatus.IN_PROGRESS }),
        makeFight({ id: 2, order: 2, athleteAId: 30, athleteBId: 40 }),
      ],
      queueItems: [
        makeQueueItem({
          id: 1,
          fightId: 1,
          position: 1,
          status: AreaQueueItemStatus.CALLED,
        }),
        makeQueueItem({ id: 2, fightId: 2, position: 2 }),
      ],
    });

    const [area] = await useCase.execute(1);

    expect(area.currentFight?.fightId).toBe(1);
    expect(area.next?.fightId).toBe(2);
    expect(area.queue?.map((fight) => fight.fightId)).toEqual([2]);
    expect(area.queuedFights).toBe(1);
  });

  it('throws NotFoundError when the competition does not exist', async () => {
    const useCase = buildUseCase({ fights: [], queueItems: [] });

    await expect(useCase.execute(999)).rejects.toBeInstanceOf(NotFoundError);
  });
});
