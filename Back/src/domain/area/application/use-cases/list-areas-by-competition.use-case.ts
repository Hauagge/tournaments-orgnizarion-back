import { Inject, Injectable } from '@nestjs/common';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { AreaQueueItemStatus } from '../../domain/value-objects/area-queue-item-status.enum';
import { IAreaRepository } from '../../repository/IAreaRepository.repository';
import { IAreaQueueItemRepository } from '../../repository/IAreaQueueItemRepository.repository';
import { AreaListItemView } from './area-list-item.view';

@Injectable()
export class ListAreasByCompetitionUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(IAreaRepository)
    private readonly areaRepository: IAreaRepository,
    @Inject(IAreaQueueItemRepository)
    private readonly areaQueueItemRepository: IAreaQueueItemRepository,
  ) {}

  async execute(competitionId: number): Promise<AreaListItemView[]> {
    const competition = await this.competitionRepository.findById(competitionId);

    if (!competition) {
      throw new NotFoundError(`Competition with id ${competitionId} not found`);
    }

    const areas = await this.areaRepository.listByCompetitionId(competitionId);

    return Promise.all(
      areas.map(async (area) => {
        const items = await this.areaQueueItemRepository.listByAreaId(area.id as number);

        return {
          id: area.id as number,
          competitionId: area.competitionId,
          name: area.name,
          order: area.order,
          totalQueueItems: items.length,
          calledItems: items.filter((item) => item.status === AreaQueueItemStatus.CALLED).length,
          doneItems: items.filter((item) => item.status === AreaQueueItemStatus.DONE).length,
        };
      }),
    );
  }
}
