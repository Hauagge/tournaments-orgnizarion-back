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
import { AreaQueueView } from './area-queue.view';
import { GetAreaQueueUseCase } from './get-area-queue.use-case';

export type MoveKeyGroupAreaDistributionInput = {
  competitionId: number;
  keyGroupId: number;
  fromAreaId: number;
  toAreaId: number;
  orderIndex: number;
};

export type MoveKeyGroupAreaDistributionOutput = {
  areas: AreaQueueView[];
};

@Injectable()
export class MoveKeyGroupAreaDistributionUseCase {
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
  ) {}

  async execute(
    input: MoveKeyGroupAreaDistributionInput,
  ): Promise<MoveKeyGroupAreaDistributionOutput> {
    const competition = await this.competitionRepository.findById(
      input.competitionId,
    );
    if (!competition) {
      throw new NotFoundError(
        `Competition with id ${input.competitionId} not found`,
      );
    }

    const [fromArea, toArea, fights] = await Promise.all([
      this.areaRepository.findById(input.fromAreaId),
      this.areaRepository.findById(input.toAreaId),
      this.fightRepository.listByKeyGroupId(input.keyGroupId),
    ]);

    if (!fromArea) {
      throw new NotFoundError(`Area with id ${input.fromAreaId} not found`);
    }

    if (!toArea) {
      throw new NotFoundError(`Area with id ${input.toAreaId} not found`);
    }

    if (
      fromArea.competitionId !== input.competitionId ||
      toArea.competitionId !== input.competitionId
    ) {
      throw new ValidationError('Area does not belong to this competition');
    }

    const movableFights = fights.filter(
      (fight) => fight.status !== FightStatus.CANCELED,
    );
    if (movableFights.length === 0) {
      throw new ValidationError('Key group has no movable fights');
    }

    if (
      movableFights.some((fight) =>
        [FightStatus.CALLED, FightStatus.IN_PROGRESS].includes(fight.status),
      )
    ) {
      throw new ValidationError(
        'Key group cannot be moved while fights are active',
      );
    }

    const queueItems = await this.areaQueueItemRepository.listByAreaIds([
      input.fromAreaId,
      input.toAreaId,
    ]);
    const sourceQueue = this.sortQueueItems(
      queueItems.filter((item) => item.areaId === input.fromAreaId),
    );
    const destinationQueue = this.sortQueueItems(
      queueItems.filter((item) => item.areaId === input.toAreaId),
    );
    const movableFightIds = new Set(
      movableFights.map((fight) => fight.id as number),
    );
    const sourceGroupItems = sourceQueue.filter((item) =>
      movableFightIds.has(item.fightId),
    );

    if (sourceGroupItems.length !== movableFightIds.size) {
      throw new ValidationError(
        'Key group is not fully allocated in the source area',
      );
    }

    const nextSourceQueue = this.reposition(
      sourceQueue.filter((item) => !movableFightIds.has(item.fightId)),
      input.fromAreaId,
    );
    const insertionIndex = Math.min(input.orderIndex, destinationQueue.length);
    const nextDestinationQueue = this.reposition(
      [
        ...destinationQueue.slice(0, insertionIndex),
        ...sourceGroupItems.map((item) =>
          AreaQueueItem.restore({
            ...item.toJSON(),
            areaId: input.toAreaId,
          }),
        ),
        ...destinationQueue.slice(insertionIndex),
      ],
      input.toAreaId,
    );

    await this.areaQueueItemRepository.replaceForAreas({
      areaIds: [input.fromAreaId, input.toAreaId],
      items: [...nextSourceQueue, ...nextDestinationQueue],
    });
    await this.fightRepository.assignAreas(
      Array.from(movableFightIds).map((fightId) => ({
        fightId,
        areaId: input.toAreaId,
      })),
    );
    await this.eventBus.publish({
      name: 'queue.updated',
      payload: {
        competitionId: input.competitionId,
        areaIds: [input.fromAreaId, input.toAreaId],
        keyGroupId: input.keyGroupId,
      },
      occurredAt: new Date(),
    });

    return {
      areas: await Promise.all([
        this.getAreaQueueUseCase.execute(input.fromAreaId),
        this.getAreaQueueUseCase.execute(input.toAreaId),
      ]),
    };
  }

  private sortQueueItems(items: AreaQueueItem[]): AreaQueueItem[] {
    return [...items].sort(
      (left, right) => left.position - right.position || (left.id ?? 0) - (right.id ?? 0),
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
