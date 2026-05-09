import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { AreaQueueItemStatus } from '../../domain/value-objects/area-queue-item-status.enum';
import { IAreaRepository } from '../../repository/IAreaRepository.repository';
import { IAreaQueueItemRepository } from '../../repository/IAreaQueueItemRepository.repository';
import { AreaQueueFightView, AreaQueueView } from './area-queue.view';

@Injectable()
export class GetAreaQueueUseCase {
  constructor(
    @Inject(IAreaRepository)
    private readonly areaRepository: IAreaRepository,
    @Inject(IAreaQueueItemRepository)
    private readonly areaQueueItemRepository: IAreaQueueItemRepository,
  ) {}

  async execute(id: number): Promise<AreaQueueView> {
    const area = await this.areaRepository.findById(id);

    if (!area) {
      throw new NotFoundError(`Area with id ${id} not found`);
    }

    const items: AreaQueueFightView[] =
      await this.areaQueueItemRepository.listFightDetailsByAreaId(id);

    const highlightedFight =
      items.find((item) => item.queueStatus === AreaQueueItemStatus.CALLED) ??
      items.find((item) => item.queueStatus === AreaQueueItemStatus.QUEUED) ??
      null;

    return {
      area: {
        id: area.id as number,
        competitionId: area.competitionId,
        name: area.name,
        order: area.order,
      },
      highlightedFight,
      queue: items.filter((item) => item.queueItemId !== highlightedFight?.queueItemId),
    };
  }
}
