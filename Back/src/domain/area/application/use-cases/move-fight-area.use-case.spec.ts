import { EventBus } from '@/core/events/event-bus.interface';
import { Area } from '@/domain/area/domain/entities/area.entity';
import { AreaQueueItem } from '@/domain/area/domain/entities/area-queue-item.entity';
import { AreaQueueItemStatus } from '@/domain/area/domain/value-objects/area-queue-item-status.enum';
import { IAreaRepository } from '@/domain/area/repository/IAreaRepository.repository';
import { FightEntity } from '@/domain/fight/domain/entities/fight.entity';
import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';
import { makeCompetition } from '../../../../../test/factories';
import {
  InMemoryAreaQueueItemRepository,
  InMemoryAreaQueueTransaction,
  InMemoryCompetitionRepository,
  InMemoryFightRepository,
} from '../../../../../test/repositories/in-memory';
import { vi } from 'vitest';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { GetAreaQueueUseCase } from './get-area-queue.use-case';
import { MoveFightAreaUseCase } from './move-fight-area.use-case';

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

class RecordingEventBus implements EventBus {
  readonly events: Array<{ name: string; payload: Record<string, unknown> }> =
    [];

  async publish(event: {
    name: string;
    payload: Record<string, unknown>;
    occurredAt: Date;
  }): Promise<void> {
    this.events.push({ name: event.name, payload: event.payload });
  }

  subscribe(): () => void {
    return () => undefined;
  }
}

function makeArea(id: number, competitionId = 1, order = 1) {
  return Area.restore({
    id,
    competitionId,
    name: `Area ${id}`,
    order,
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
  });
}

function makeFight(input: {
  id: number;
  competitionId?: number;
  areaId?: number | null;
  status?: FightStatus;
  orderIndex?: number;
}) {
  return FightEntity.restore({
    id: input.id,
    competitionId: input.competitionId ?? 1,
    categoryId: 1,
    keyGroupId: 10,
    areaId: input.areaId ?? null,
    areaName: input.areaId ? `Area ${input.areaId}` : null,
    status: input.status ?? FightStatus.PENDING,
    athleteAId: input.id * 2,
    athleteBId: input.id * 2 + 1,
    winnerAthleteId: null,
    loserId: null,
    winType: null,
    startedAt: null,
    finishedAt: null,
    orderIndex: input.orderIndex ?? input.id,
  });
}

function makeQueueItem(input: {
  id: number;
  areaId: number;
  fightId: number;
  position: number;
}) {
  return AreaQueueItem.restore({
    ...input,
    status: AreaQueueItemStatus.QUEUED,
  });
}

describe('MoveFightAreaUseCase', () => {
  function makeSut(input: {
    fights: FightEntity[];
    queueItems: AreaQueueItem[];
    areas?: Area[];
  }) {
    const competitionRepository = new InMemoryCompetitionRepository([
      makeCompetition({ id: 1 }),
    ]);
    const fightRepository = new InMemoryFightRepository(input.fights);
    const areaRepository = new InMemoryAreaRepository(
      input.areas ?? [makeArea(1, 1, 1), makeArea(2, 1, 2)],
    );
    const areaQueueItemRepository = new InMemoryAreaQueueItemRepository(
      input.queueItems,
    );
    const getAreaQueueUseCase = new GetAreaQueueUseCase(
      areaRepository,
      areaQueueItemRepository,
    );
    const eventBus = new RecordingEventBus();
    const useCase = new MoveFightAreaUseCase(
      competitionRepository,
      areaRepository,
      areaQueueItemRepository,
      fightRepository,
      getAreaQueueUseCase,
      eventBus,
      new InMemoryAreaQueueTransaction(
        areaQueueItemRepository,
        fightRepository,
      ),
    );

    return { useCase, areaQueueItemRepository, fightRepository, eventBus };
  }

  it('desfaz a fila quando a gravacao da area da luta falha (luta nao fica sem area)', async () => {
    const { useCase, areaQueueItemRepository, fightRepository, eventBus } =
      makeSut({
        fights: [
          makeFight({ id: 1, areaId: 1 }),
          makeFight({ id: 2, areaId: 2 }),
        ],
        queueItems: [
          makeQueueItem({ id: 101, areaId: 1, fightId: 1, position: 1 }),
          makeQueueItem({ id: 102, areaId: 2, fightId: 2, position: 1 }),
        ],
      });
    vi.spyOn(fightRepository, 'assignAreas').mockRejectedValueOnce(
      new Error('conexao caiu'),
    );

    await expect(
      useCase.execute({ competitionId: 1, fightId: 1, toAreaId: 2 }),
    ).rejects.toThrow('conexao caiu');

    expect(
      (await areaQueueItemRepository.listByAreaId(1)).map(
        (item) => item.fightId,
      ),
    ).toEqual([1]);
    expect(
      (await areaQueueItemRepository.listByAreaId(2)).map(
        (item) => item.fightId,
      ),
    ).toEqual([2]);
    expect((await fightRepository.findById(1))?.areaId).toBe(1);
    expect(eventBus.events).toEqual([]);
  });

  it('moves the pending fight to the destination area at the requested position', async () => {
    const movingFight = makeFight({ id: 1, areaId: 1 });
    const sourceOtherFight = makeFight({ id: 2, areaId: 1 });
    const destinationExistingFight = makeFight({ id: 3, areaId: 2 });

    const { useCase, areaQueueItemRepository, fightRepository, eventBus } =
      makeSut({
        fights: [movingFight, sourceOtherFight, destinationExistingFight],
        queueItems: [
          makeQueueItem({ id: 101, areaId: 1, fightId: 1, position: 1 }),
          makeQueueItem({ id: 102, areaId: 1, fightId: 2, position: 2 }),
          makeQueueItem({ id: 103, areaId: 2, fightId: 3, position: 1 }),
        ],
      });

    const result = await useCase.execute({
      competitionId: 1,
      fightId: 1,
      toAreaId: 2,
      orderIndex: 0,
    });

    expect(
      (await areaQueueItemRepository.listByAreaId(1)).map(
        (item) => item.fightId,
      ),
    ).toEqual([2]);
    expect(
      (await areaQueueItemRepository.listByAreaId(1)).map(
        (item) => item.position,
      ),
    ).toEqual([1]);
    expect(
      (await areaQueueItemRepository.listByAreaId(2)).map(
        (item) => item.fightId,
      ),
    ).toEqual([1, 3]);
    expect(
      (await areaQueueItemRepository.listByAreaId(2)).map(
        (item) => item.position,
      ),
    ).toEqual([1, 2]);
    expect((await fightRepository.findById(1))?.areaId).toBe(2);
    expect(result.areas.map((area) => area.area.id)).toEqual([1, 2]);
    expect(eventBus.events).toEqual([
      {
        name: 'queue.updated',
        payload: {
          competitionId: 1,
          areaIds: [1, 2],
          fightId: 1,
        },
      },
    ]);
  });

  it('defaults to the end of the destination queue when orderIndex is omitted', async () => {
    const movingFight = makeFight({ id: 1, areaId: 1 });
    const destinationExistingFight = makeFight({ id: 2, areaId: 2 });

    const { useCase, areaQueueItemRepository } = makeSut({
      fights: [movingFight, destinationExistingFight],
      queueItems: [
        makeQueueItem({ id: 101, areaId: 1, fightId: 1, position: 1 }),
        makeQueueItem({ id: 102, areaId: 2, fightId: 2, position: 1 }),
      ],
    });

    await useCase.execute({
      competitionId: 1,
      fightId: 1,
      toAreaId: 2,
    });

    expect(
      (await areaQueueItemRepository.listByAreaId(2)).map(
        (item) => item.fightId,
      ),
    ).toEqual([2, 1]);
  });

  it('rejects moving a fight that belongs to another competition', async () => {
    const { useCase } = makeSut({
      fights: [makeFight({ id: 1, competitionId: 2, areaId: 1 })],
      queueItems: [
        makeQueueItem({ id: 101, areaId: 1, fightId: 1, position: 1 }),
      ],
    });

    await expect(
      useCase.execute({ competitionId: 1, fightId: 1, toAreaId: 2 }),
    ).rejects.toThrow(NotFoundError);
  });

  it('rejects moving a fight that does not exist', async () => {
    const { useCase } = makeSut({ fights: [], queueItems: [] });

    await expect(
      useCase.execute({ competitionId: 1, fightId: 999, toAreaId: 2 }),
    ).rejects.toThrow(NotFoundError);
  });

  it('rejects moving to an area from another competition', async () => {
    const { useCase } = makeSut({
      fights: [makeFight({ id: 1, areaId: 1 })],
      queueItems: [
        makeQueueItem({ id: 101, areaId: 1, fightId: 1, position: 1 }),
      ],
      areas: [makeArea(1, 1, 1), makeArea(2, 2, 1)],
    });

    await expect(
      useCase.execute({ competitionId: 1, fightId: 1, toAreaId: 2 }),
    ).rejects.toThrow(ValidationError);
  });

  it('rejects moving a fight that is not pending', async () => {
    const { useCase } = makeSut({
      fights: [makeFight({ id: 1, areaId: 1, status: FightStatus.CALLED })],
      queueItems: [
        makeQueueItem({ id: 101, areaId: 1, fightId: 1, position: 1 }),
      ],
    });

    await expect(
      useCase.execute({ competitionId: 1, fightId: 1, toAreaId: 2 }),
    ).rejects.toThrow(new ValidationError('So e possivel mover luta pendente'));
  });

  it('rejects moving a fight that is not queued in any area', async () => {
    const { useCase } = makeSut({
      fights: [makeFight({ id: 1, areaId: null })],
      queueItems: [],
    });

    await expect(
      useCase.execute({ competitionId: 1, fightId: 1, toAreaId: 2 }),
    ).rejects.toThrow(ValidationError);
  });

  it('rejects moving a fight to the area it is already in', async () => {
    const { useCase } = makeSut({
      fights: [makeFight({ id: 1, areaId: 1 })],
      queueItems: [
        makeQueueItem({ id: 101, areaId: 1, fightId: 1, position: 1 }),
      ],
    });

    await expect(
      useCase.execute({ competitionId: 1, fightId: 1, toAreaId: 1 }),
    ).rejects.toThrow(ValidationError);
  });
});
