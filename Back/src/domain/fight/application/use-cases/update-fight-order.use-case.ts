import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { EventBus } from '@/core/events/event-bus.interface';
import { AreaQueueItem } from '@/domain/area/domain/entities/area-queue-item.entity';
import { AreaQueueItemStatus } from '@/domain/area/domain/value-objects/area-queue-item-status.enum';
import { IAreaQueueItemRepository } from '@/domain/area/repository/IAreaQueueItemRepository.repository';
import { IUserCompetitionRepository } from '@/domain/auth/repository/IUserCompetitionRepository.repository';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { IFightRepository } from '../../repository/IFightRepository.repository';

export type UpdateFightOrderInput = {
  currentUserId: number;
  competitionId: number;
  items: Array<{
    fightId: number;
    orderIndex: number;
  }>;
};

export type UpdateFightOrderView = {
  competitionId: number;
  totalUpdated: number;
  items: Array<{
    fightId: number;
    orderIndex: number;
  }>;
};

@Injectable()
export class UpdateFightOrderUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(IUserCompetitionRepository)
    private readonly userCompetitionRepository: IUserCompetitionRepository,
    @Inject(IFightRepository)
    private readonly fightRepository: IFightRepository,
    @Inject(IAreaQueueItemRepository)
    private readonly areaQueueItemRepository: IAreaQueueItemRepository,
    @Inject(EventBus)
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: UpdateFightOrderInput): Promise<UpdateFightOrderView> {
    const competition = await this.competitionRepository.findById(
      input.competitionId,
    );

    if (!competition) {
      throw new NotFoundError(
        `Competition with id ${input.competitionId} not found`,
      );
    }

    const access =
      await this.userCompetitionRepository.findByUserIdAndCompetitionId({
        userId: input.currentUserId,
        competitionId: input.competitionId,
      });

    if (!access) {
      throw new ForbiddenException(
        'Usuario autenticado nao possui acesso a esta competicao',
      );
    }

    this.assertNoDuplicatedFightIds(input.items);
    this.assertNoDuplicatedOrderIndexes(input.items);

    const competitionFights = await this.fightRepository.listByCompetitionId({
      competitionId: input.competitionId,
    });
    const fightIdsFromCompetition = new Set(
      competitionFights
        .map((fight) => fight.id)
        .filter((id): id is number => id !== undefined),
    );
    const invalidFightIds = input.items
      .map((item) => item.fightId)
      .filter((fightId) => !fightIdsFromCompetition.has(fightId));

    if (invalidFightIds.length > 0) {
      throw new ValidationError(
        'Uma ou mais lutas não pertencem à competição informada.',
        {
          fightIds: invalidFightIds,
        },
      );
    }

    const normalizedItems = [...input.items].sort(
      (left, right) => left.orderIndex - right.orderIndex,
    );

    await this.fightRepository.updateOrder(normalizedItems);

    const resequencedAreaIds = await this.resequenceAreaQueues({
      competitionFights,
      normalizedItems,
    });

    const result = {
      competitionId: input.competitionId,
      totalUpdated: normalizedItems.length,
      items: normalizedItems,
    };

    await this.eventBus.publish({
      name: 'fights.order.updated',
      payload: {
        competitionId: input.competitionId,
      },
      occurredAt: new Date(),
    });

    for (const areaId of resequencedAreaIds) {
      await this.eventBus.publish({
        name: 'queue.updated',
        payload: {
          competitionId: input.competitionId,
          areaId,
        },
        occurredAt: new Date(),
      });
    }

    return result;
  }

  /**
   * A ordem manual da aba de Lutas e a ordem de chamada das areas: as lutas
   * ainda na fila sao reposicionadas na nova sequencia. Itens ja chamados ou
   * concluidos ficam na frente, na ordem em que aconteceram.
   */
  private async resequenceAreaQueues(input: {
    competitionFights: Awaited<
      ReturnType<IFightRepository['listByCompetitionId']>
    >;
    normalizedItems: UpdateFightOrderInput['items'];
  }): Promise<number[]> {
    const orderIndexByFightId = new Map(
      input.normalizedItems.map((item) => [item.fightId, item.orderIndex]),
    );
    const areaIds = Array.from(
      new Set(
        input.competitionFights
          .filter(
            (fight) =>
              fight.id !== undefined &&
              orderIndexByFightId.has(fight.id) &&
              fight.areaId !== null,
          )
          .map((fight) => fight.areaId as number),
      ),
    );

    if (areaIds.length === 0) {
      return [];
    }

    const queueItems = await this.areaQueueItemRepository.listByAreaIds(areaIds);

    if (queueItems.length === 0) {
      return [];
    }

    const nextItems: AreaQueueItem[] = [];
    const changedAreaIds: number[] = [];

    for (const areaId of areaIds) {
      const areaItems = [...queueItems]
        .filter((item) => item.areaId === areaId)
        .sort(
          (left, right) =>
            left.position - right.position || (left.id ?? 0) - (right.id ?? 0),
        );

      if (areaItems.length === 0) {
        continue;
      }

      const locked = areaItems.filter(
        (item) => item.status !== AreaQueueItemStatus.QUEUED,
      );
      const queued = areaItems
        .filter((item) => item.status === AreaQueueItemStatus.QUEUED)
        .sort((left, right) => {
          const leftOrder =
            orderIndexByFightId.get(left.fightId) ?? Number.MAX_SAFE_INTEGER;
          const rightOrder =
            orderIndexByFightId.get(right.fightId) ?? Number.MAX_SAFE_INTEGER;

          return leftOrder - rightOrder || left.position - right.position;
        });

      const resequenced = [...locked, ...queued].map((item, index) =>
        AreaQueueItem.restore({ ...item.toJSON(), position: index + 1 }),
      );

      const hasChanges = resequenced.some(
        (item, index) => item.fightId !== areaItems[index].fightId,
      );

      if (hasChanges) {
        changedAreaIds.push(areaId);
      }

      nextItems.push(...resequenced);
    }

    if (changedAreaIds.length === 0) {
      return [];
    }

    await this.areaQueueItemRepository.replaceForAreas({
      areaIds,
      items: nextItems,
    });

    return changedAreaIds;
  }

  private assertNoDuplicatedFightIds(
    items: UpdateFightOrderInput['items'],
  ): void {
    const uniqueIds = new Set(items.map((item) => item.fightId));

    if (uniqueIds.size !== items.length) {
      throw new ValidationError('Payload possui lutas duplicadas.');
    }
  }

  private assertNoDuplicatedOrderIndexes(
    items: UpdateFightOrderInput['items'],
  ): void {
    const uniqueIndexes = new Set(items.map((item) => item.orderIndex));

    if (uniqueIndexes.size !== items.length) {
      throw new ValidationError('Payload possui posições de ordem duplicadas.');
    }
  }
}
