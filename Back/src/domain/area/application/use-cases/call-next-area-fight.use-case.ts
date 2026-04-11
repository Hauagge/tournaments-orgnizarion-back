import { Inject, Injectable } from '@nestjs/common';
import { EventBus } from '@/core/events/event-bus.interface';
import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';
import { IFightRepository } from '@/domain/fight/repository/IFightRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { AreaQueueItemStatus } from '../../domain/value-objects/area-queue-item-status.enum';
import { IAreaRepository } from '../../repository/IAreaRepository.repository';
import { IAreaQueueItemRepository } from '../../repository/IAreaQueueItemRepository.repository';

@Injectable()
export class CallNextAreaFightUseCase {
  constructor(
    @Inject(IAreaRepository)
    private readonly areaRepository: IAreaRepository,
    @Inject(IAreaQueueItemRepository)
    private readonly areaQueueItemRepository: IAreaQueueItemRepository,
    @Inject(IFightRepository)
    private readonly fightRepository: IFightRepository,
    @Inject(EventBus)
    private readonly eventBus: EventBus,
  ) {}

  async execute(id: number) {
    const area = await this.areaRepository.findById(id);

    if (!area) {
      throw new NotFoundError(`Area with id ${id} not found`);
    }

    const queueItems = await this.areaQueueItemRepository.listByAreaId(id);
    const calledItem = queueItems.find((item) => item.status === AreaQueueItemStatus.CALLED);

    if (calledItem) {
      const calledFight = await this.fightRepository.findById(calledItem.fightId);
      if (calledFight && calledFight.status !== FightStatus.FINISHED) {
        throw new ValidationError('This area already has a called or in-progress fight');
      }
    }

    const nextItem = queueItems.find((item) => item.status === AreaQueueItemStatus.QUEUED);

    if (!nextItem) {
      throw new ValidationError('No queued fights available for this area');
    }

    const fight = await this.fightRepository.findById(nextItem.fightId);
    if (!fight) {
      throw new NotFoundError(`Fight with id ${nextItem.fightId} not found`);
    }

    const updatedFight = await this.fightRepository.update(fight.call());
    const updatedQueueItem = await this.areaQueueItemRepository.update(nextItem.call());

    await this.eventBus.publish({
      name: 'queue.updated',
      payload: {
        competitionId: area.competitionId,
        areaId: area.id as number,
        areaName: area.name,
        fightId: updatedFight.id as number,
        queueItemId: updatedQueueItem.id as number,
      },
      occurredAt: new Date(),
    });

    await this.eventBus.publish({
      name: 'nextfight.updated',
      payload: {
        competitionId: area.competitionId,
        areaId: area.id as number,
        areaName: area.name,
        currentFightId: updatedFight.id as number,
        nextFightId:
          queueItems.find((item) => item.id !== nextItem.id && item.status === AreaQueueItemStatus.QUEUED)
            ?.fightId ?? null,
      },
      occurredAt: new Date(),
    });

    return updatedFight;
  }
}
