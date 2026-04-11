import { Inject, Injectable } from '@nestjs/common';
import { IAreaRepository } from '@/domain/area/repository/IAreaRepository.repository';
import { IFightRepository } from '@/domain/fight/repository/IFightRepository.repository';
import { ValidationError } from '@/shared/errors/validation.error';

@Injectable()
export class KeyGroupAreaSelectionService {
  constructor(
    @Inject(IAreaRepository)
    private readonly areaRepository: IAreaRepository,
    @Inject(IFightRepository)
    private readonly fightRepository: IFightRepository,
  ) {}

  async select(competitionId: number) {
    const areas = await this.areaRepository.listByCompetitionId(competitionId);

    if (areas.length === 0) {
      throw new ValidationError('No areas configured for this competition');
    }

    const rankedAreas = await Promise.all(
      areas.map(async (area) => ({
        area,
        queueCount: (
          await this.fightRepository.listQueueByAreaId(area.id as number)
        ).length,
      })),
    );

    rankedAreas.sort((left, right) => {
      const queueCompare = left.queueCount - right.queueCount;
      if (queueCompare !== 0) {
        return queueCompare;
      }

      const orderCompare = left.area.order - right.area.order;
      if (orderCompare !== 0) {
        return orderCompare;
      }

      return (left.area.id as number) - (right.area.id as number);
    });

    return rankedAreas[0].area;
  }
}
