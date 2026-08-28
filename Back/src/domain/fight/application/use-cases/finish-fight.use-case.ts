import { Inject, Injectable } from '@nestjs/common';
import { EventBus } from '@/core/events/event-bus.interface';
import { AreaQueueItemStatus } from '@/domain/area/domain/value-objects/area-queue-item-status.enum';
import { IAreaQueueItemRepository } from '@/domain/area/repository/IAreaQueueItemRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { FightStatus } from '../../domain/value-objects/fight-status.enum';
import { IFightRepository } from '../../repository/IFightRepository.repository';
import { MarkFightWinnerUseCase } from './mark-fight-winner.use-case';

export type FinishFightInput = {
  id: number;
  winnerAthleteId: number;
  winType: string;
};

@Injectable()
export class FinishFightUseCase {
  constructor(
    @Inject(IFightRepository)
    private readonly fightRepository: IFightRepository,
    @Inject(IAreaQueueItemRepository)
    private readonly areaQueueItemRepository: IAreaQueueItemRepository,
    private readonly markFightWinnerUseCase: MarkFightWinnerUseCase,
    @Inject(EventBus)
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: FinishFightInput) {
    const fight = await this.fightRepository.findById(input.id);

    if (!fight) {
      throw new NotFoundError(`Fight with id ${input.id} not found`);
    }

    if (fight.status !== FightStatus.IN_PROGRESS) {
      throw new ValidationError('Only fights in progress can be finished');
    }

    await this.markFightWinnerUseCase.execute({
      competitionId: fight.competitionId,
      fightId: input.id,
      winnerId: input.winnerAthleteId,
      winType: input.winType,
    });

    const finishedFight = await this.fightRepository.findById(input.id);

    if (!finishedFight) {
      throw new NotFoundError(`Fight with id ${input.id} not found`);
    }

    const queueItem = await this.areaQueueItemRepository.findByFightId(
      finishedFight.id as number,
    );

    if (queueItem) {
      const areaQueue = await this.areaQueueItemRepository.listByAreaId(
        queueItem.areaId,
      );
      const nextQueueItem =
        areaQueue.find(
          (item) => item.status === AreaQueueItemStatus.CALLED,
        ) ??
        areaQueue.find((item) => item.status === AreaQueueItemStatus.QUEUED) ??
        null;

      await this.eventBus.publish({
        name: 'nextfight.updated',
        payload: {
          competitionId: finishedFight.competitionId,
          areaId: queueItem.areaId,
          currentFightId: finishedFight.id as number,
          nextFightId: nextQueueItem?.fightId ?? null,
        },
        occurredAt: new Date(),
      });
    }

    return finishedFight;
  }
}
