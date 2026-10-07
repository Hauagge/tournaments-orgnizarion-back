import { Inject, Injectable } from '@nestjs/common';
import { EventBus } from '@/core/events/event-bus.interface';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';
import { IFightRepository } from '@/domain/fight/repository/IFightRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { AreaQueueItem } from '../../domain/entities/area-queue-item.entity';
import { IAreaRepository } from '../../repository/IAreaRepository.repository';
import { IAreaQueueItemRepository } from '../../repository/IAreaQueueItemRepository.repository';
import { IAreaQueueTransaction } from '../../repository/IAreaQueueTransaction.repository';
import { AreaQueueView } from './area-queue.view';
import { GetAreaQueueUseCase } from './get-area-queue.use-case';

export type MoveFightAreaInput = {
  competitionId: number;
  fightId: number;
  toAreaId: number;
  orderIndex?: number;
};

export type MoveFightAreaOutput = {
  areas: AreaQueueView[];
};

@Injectable()
export class MoveFightAreaUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(IAreaRepository)
    private readonly areaRepository: IAreaRepository,
    @Inject(IAreaQueueItemRepository)
    private readonly areaQueueItemRepository: IAreaQueueItemRepository,
    @Inject(IFightRepository)
    private readonly fightRepository: IFightRepository,
    private readonly getAreaQueueUseCase: GetAreaQueueUseCase,
    @Inject(EventBus)
    private readonly eventBus: EventBus,
    @Inject(IAreaQueueTransaction)
    private readonly areaQueueTransaction: IAreaQueueTransaction,
  ) {}

  async execute(input: MoveFightAreaInput): Promise<MoveFightAreaOutput> {
    const competition = await this.competitionRepository.findById(
      input.competitionId,
    );
    if (!competition) {
      throw new NotFoundError(
        `Competition with id ${input.competitionId} not found`,
      );
    }

    const fight = await this.fightRepository.findById(input.fightId);
    if (!fight || fight.competitionId !== input.competitionId) {
      throw new NotFoundError(`Fight with id ${input.fightId} not found`);
    }

    const toArea = await this.areaRepository.findById(input.toAreaId);
    if (!toArea || toArea.competitionId !== input.competitionId) {
      throw new ValidationError(
        'Area de destino nao pertence a esta competicao',
      );
    }

    if (fight.status !== FightStatus.PENDING) {
      throw new ValidationError('So e possivel mover luta pendente');
    }

    const queueItem = await this.areaQueueItemRepository.findByFightId(
      input.fightId,
    );
    if (!queueItem) {
      throw new ValidationError('Luta nao esta na fila de nenhuma area');
    }

    const fromAreaId = queueItem.areaId;
    if (fromAreaId === input.toAreaId) {
      throw new ValidationError('Area de destino e igual a area de origem');
    }

    const queueItems = await this.areaQueueItemRepository.listByAreaIds([
      fromAreaId,
      input.toAreaId,
    ]);
    const sourceQueue = this.sortQueueItems(
      queueItems.filter((item) => item.areaId === fromAreaId),
    );
    const destinationQueue = this.sortQueueItems(
      queueItems.filter((item) => item.areaId === input.toAreaId),
    );

    const nextSourceQueue = this.reposition(
      sourceQueue.filter((item) => item.fightId !== input.fightId),
      fromAreaId,
    );
    const insertionIndex = Math.min(
      input.orderIndex ?? destinationQueue.length,
      destinationQueue.length,
    );
    const movedItem = AreaQueueItem.restore({
      ...queueItem.toJSON(),
      areaId: input.toAreaId,
    });
    const nextDestinationQueue = this.reposition(
      [
        ...destinationQueue.slice(0, insertionIndex),
        movedItem,
        ...destinationQueue.slice(insertionIndex),
      ],
      input.toAreaId,
    );

    await this.areaQueueTransaction.run(async ({ areaQueueItems, fights }) => {
      await areaQueueItems.replaceForAreas({
        areaIds: [fromAreaId, input.toAreaId],
        items: [...nextSourceQueue, ...nextDestinationQueue],
      });
      await fights.assignAreas([
        { fightId: input.fightId, areaId: input.toAreaId },
      ]);
    });
    await this.eventBus.publish({
      name: 'queue.updated',
      payload: {
        competitionId: input.competitionId,
        areaIds: [fromAreaId, input.toAreaId],
        fightId: input.fightId,
      },
      occurredAt: new Date(),
    });

    return {
      areas: await Promise.all([
        this.getAreaQueueUseCase.execute(fromAreaId),
        this.getAreaQueueUseCase.execute(input.toAreaId),
      ]),
    };
  }

  private sortQueueItems(items: AreaQueueItem[]): AreaQueueItem[] {
    return [...items].sort(
      (left, right) =>
        left.position - right.position || (left.id ?? 0) - (right.id ?? 0),
    );
  }

  private reposition(items: AreaQueueItem[], areaId: number): AreaQueueItem[] {
    return items.map((item, index) =>
      AreaQueueItem.restore({
        ...item.toJSON(),
        areaId,
        position: index + 1,
      }),
    );
  }
}
