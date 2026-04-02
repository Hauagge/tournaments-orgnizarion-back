import { Inject, Injectable } from '@nestjs/common';
import { EventBus } from '@/core/events/event-bus.interface';
import { IAreaQueueItemRepository } from '@/domain/area/repository/IAreaQueueItemRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { FightStatus } from '../../domain/value-objects/fight-status.enum';
import { IFightRepository } from '../../repository/IFightRepository.repository';

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

    const finishedFight = await this.fightRepository.update(
      fight.finish({
        winnerAthleteId: input.winnerAthleteId,
        winType: input.winType,
        finishedAt: new Date(),
      }),
    );

    const queueItem = await this.areaQueueItemRepository.findByFightId(finishedFight.id as number);
    if (queueItem) {
      await this.areaQueueItemRepository.update(queueItem.markDone());
      const areaQueue = await this.areaQueueItemRepository.listByAreaId(queueItem.areaId);
      const nextQueueItem =
        areaQueue.find((item) => item.id === queueItem.id)?.status === 'CALLED'
          ? areaQueue.find((item) => item.status === 'QUEUED')
          : areaQueue.find((item) => item.status === 'CALLED') ??
            areaQueue.find((item) => item.status === 'QUEUED');

      await this.eventBus.publish({
        name: 'queue.updated',
        payload: {
          competitionId: finishedFight.competitionId,
          areaId: queueItem.areaId,
          fightId: finishedFight.id as number,
          queueItemId: queueItem.id as number,
          status: 'DONE',
        },
        occurredAt: new Date(),
      });

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

    await this.eventBus.publish({
      name: 'fight.finished',
      payload: {
        fightId: finishedFight.id as number,
        competitionId: finishedFight.competitionId,
        winnerAthleteId: finishedFight.winnerAthleteId,
        winType: finishedFight.winType,
      },
      occurredAt: new Date(),
    });

    return finishedFight;
  }
}
