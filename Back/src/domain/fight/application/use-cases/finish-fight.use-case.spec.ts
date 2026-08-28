import { beforeEach, describe, expect, it } from 'vitest';
import {
  DomainEvent,
  DomainEventHandler,
  EventBus,
} from '@/core/events/event-bus.interface';
import { AreaQueueItem } from '@/domain/area/domain/entities/area-queue-item.entity';
import { AreaQueueItemTypeOrmEntity } from '@/domain/area/infra/persistence/entities/area-queue-item.typeorm-entity';
import { AreaQueueItemStatus } from '@/domain/area/domain/value-objects/area-queue-item-status.enum';
import { CategoryTypeOrmEntity } from '@/domain/category/infra/persistence/entities/category.typeorm-entity';
import { ICategoryRepository } from '@/domain/category/repository/ICategoryRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { makeFight as makeFightRow } from '../../../../../test/factories/fight.factory';
import { makeFakeDataSource } from '../../../../../test/fakes/typeorm-fake-data-source';
import { InMemoryAreaQueueItemRepository } from '../../../../../test/repositories/in-memory';
import { FightTypeOrmEntity } from '../../entities/fight.typeorm-entity';
import { FightMapper } from '../../infra/persistence/mappers/fight.mapper';
import { IFightRepository } from '../../repository/IFightRepository.repository';
import { FightStatus } from '../../domain/value-objects/fight-status.enum';
import { BestOfThreeProgressionService } from '../services/best-of-three-progression.service';
import { FinishFightUseCase } from './finish-fight.use-case';
import { MarkFightWinnerUseCase } from './mark-fight-winner.use-case';

class RecordingEventBus implements EventBus {
  public published: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.published.push(event);
  }

  subscribe(_eventName: string, _handler: DomainEventHandler): () => void {
    return () => {};
  }
}

describe('FinishFightUseCase', () => {
  let eventBus: RecordingEventBus;

  beforeEach(() => {
    eventBus = new RecordingEventBus();
  });

  function setup(input: {
    fights: FightTypeOrmEntity[];
    categories?: CategoryTypeOrmEntity[];
    queueItems?: AreaQueueItem[];
  }) {
    const { manager, dataSource } = makeFakeDataSource({
      fights: input.fights,
      categories: input.categories,
      areaQueueItems: (input.queueItems ?? []).map(
        (item) => ({ ...item.toJSON() }) as AreaQueueItemTypeOrmEntity,
      ),
    });
    // O use case le pelo repositorio de dominio e escreve pela transacao do
    // mark-winner: as duas visoes olham as mesmas linhas, como em producao.
    const fightRepository = {
      findById: async (id: number) => {
        const row = await manager.fights.findOneBy({
          id,
        } as Partial<FightTypeOrmEntity>);

        return row ? FightMapper.toDomain(row) : null;
      },
    } as unknown as IFightRepository;
    const areaQueueItemRepository = new InMemoryAreaQueueItemRepository(
      input.queueItems ?? [],
    );
    const markFightWinnerUseCase = new MarkFightWinnerUseCase(
      dataSource as never,
      {} as ICategoryRepository,
      eventBus,
      new BestOfThreeProgressionService(),
    );
    const useCase = new FinishFightUseCase(
      fightRepository,
      areaQueueItemRepository,
      markFightWinnerUseCase,
      eventBus,
    );

    return { useCase, manager, areaQueueItemRepository };
  }

  it('finishes an in-progress fight recording winner and loser', async () => {
    const { useCase } = setup({
      fights: [makeFightRow({ status: FightStatus.IN_PROGRESS })],
    });

    const result = await useCase.execute({
      id: 1,
      winnerAthleteId: 1,
      winType: 'POINTS',
    });

    expect(result.status).toBe(FightStatus.FINISHED);
    expect(result.winnerId).toBe(1);
    expect(result.loserId).toBe(2);
    expect(eventBus.published).toContainEqual(
      expect.objectContaining({
        name: 'fight.finished',
        payload: expect.objectContaining({ fightId: 1, winnerAthleteId: 1 }),
      }),
    );
  });

  it('advances the winner into the next bracket fight', async () => {
    const { useCase, manager } = setup({
      fights: [
        makeFightRow({
          id: 1,
          status: FightStatus.IN_PROGRESS,
          nextFightId: 3,
          nextFightSlot: 'A',
        }),
        makeFightRow({
          id: 3,
          round: 2,
          order: 3,
          status: FightStatus.PENDING,
          athleteAId: null,
          athleteBId: null,
        }),
      ],
    });

    await useCase.execute({ id: 1, winnerAthleteId: 2, winType: 'POINTS' });

    const nextFight = await manager.fights.findOneBy({ id: 3 });
    expect(nextFight?.athleteAId).toBe(2);
    expect(nextFight?.athleteBId).toBeNull();
  });

  it('moves the next fight to the area where the fight was disputed', async () => {
    const { useCase, manager } = setup({
      fights: [
        makeFightRow({
          id: 1,
          areaId: 2,
          status: FightStatus.IN_PROGRESS,
          nextFightId: 3,
          nextFightSlot: 'B',
        }),
        makeFightRow({
          id: 3,
          areaId: 9,
          round: 2,
          order: 3,
          status: FightStatus.PENDING,
          athleteAId: null,
          athleteBId: null,
        }),
      ],
      queueItems: [
        AreaQueueItem.restore({
          id: 5,
          areaId: 2,
          fightId: 1,
          position: 1,
          status: AreaQueueItemStatus.CALLED,
        }),
      ],
    });

    await useCase.execute({ id: 1, winnerAthleteId: 1, winType: 'POINTS' });

    const nextFight = await manager.fights.findOneBy({ id: 3 });
    expect(nextFight?.areaId).toBe(2);
    expect(nextFight?.athleteBId).toBe(1);
    const nextQueueItem = await manager.areaQueueItems.findOneBy({ fightId: 3 });
    expect(nextQueueItem?.areaId).toBe(2);
  });

  it('sets the category champion when there is no next fight', async () => {
    const { useCase, manager } = setup({
      fights: [makeFightRow({ status: FightStatus.IN_PROGRESS, categoryId: 7 })],
      categories: [{ id: 7, championAthleteId: null } as CategoryTypeOrmEntity],
    });

    await useCase.execute({ id: 1, winnerAthleteId: 1, winType: 'POINTS' });

    const category = await manager.categories.findOneBy({ id: 7 });
    expect(category?.championAthleteId).toBe(1);
  });

  it('rejects a winner that does not belong to the fight', async () => {
    const { useCase } = setup({
      fights: [makeFightRow({ status: FightStatus.IN_PROGRESS })],
    });

    await expect(
      useCase.execute({ id: 1, winnerAthleteId: 99, winType: 'POINTS' }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('marks the queue item as done and publishes queue.updated when one exists', async () => {
    const { useCase, manager, areaQueueItemRepository } = setup({
      fights: [makeFightRow({ status: FightStatus.IN_PROGRESS, areaId: 2 })],
      queueItems: [
        AreaQueueItem.restore({
          id: 5,
          areaId: 2,
          fightId: 1,
          position: 1,
          status: AreaQueueItemStatus.CALLED,
        }),
      ],
    });

    await useCase.execute({ id: 1, winnerAthleteId: 2, winType: 'SUBMISSION' });

    expect(eventBus.published.map((event) => event.name)).toEqual(
      expect.arrayContaining([
        'fight.finished',
        'queue.updated',
        'nextfight.updated',
      ]),
    );
    const queueRow = await manager.areaQueueItems.findOneBy({ id: 5 });
    expect(queueRow?.status).toBe(AreaQueueItemStatus.DONE);
    expect(areaQueueItemRepository.items).toHaveLength(1);
  });

  it('throws NotFoundError when the fight does not exist', async () => {
    const { useCase } = setup({ fights: [] });

    await expect(
      useCase.execute({ id: 999, winnerAthleteId: 10, winType: 'POINTS' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects finishing a fight that is not in progress', async () => {
    const { useCase } = setup({
      fights: [makeFightRow({ status: FightStatus.PENDING })],
    });

    await expect(
      useCase.execute({ id: 1, winnerAthleteId: 1, winType: 'POINTS' }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
