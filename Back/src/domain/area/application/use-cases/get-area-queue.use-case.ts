import { Inject, Injectable } from '@nestjs/common';
import { IAthleteRepository } from '@/domain/athlete/repository/IAthleteRepository.repository';
import { IFightRepository } from '@/domain/fight/repository/IFightRepository.repository';
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
    @Inject(IFightRepository)
    private readonly fightRepository: IFightRepository,
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
  ) {}

  async execute(id: number): Promise<AreaQueueView> {
    const area = await this.areaRepository.findById(id);

    if (!area) {
      throw new NotFoundError(`Area with id ${id} not found`);
    }

    const queueItems = await this.areaQueueItemRepository.listByAreaId(id);
    const fights = await Promise.all(
      queueItems.map((item) => this.fightRepository.findById(item.fightId)),
    );
    const existingFights = fights.filter((fight) => fight !== null);
    const athleteIds = Array.from(
      new Set(existingFights.flatMap((fight) => [fight.athleteAId, fight.athleteBId])),
    );
    const athletes = await this.athleteRepository.findByIds(athleteIds);
    const athleteNamesById = new Map(
      athletes.map((athlete) => [athlete.id as number, athlete.fullName]),
    );
    const fightById = new Map(
      existingFights.map((fight) => [fight.id as number, fight]),
    );

    const items = queueItems
      .map<AreaQueueFightView | null>((item) => {
        const fight = fightById.get(item.fightId);
        if (!fight) {
          return null;
        }

        return {
          queueItemId: item.id as number,
          fightId: item.fightId,
          position: item.position,
          queueStatus: item.status,
          fightStatus: fight.status,
          athleteAId: fight.athleteAId,
          athleteAName: athleteNamesById.get(fight.athleteAId) ?? null,
          athleteBId: fight.athleteBId,
          athleteBName: athleteNamesById.get(fight.athleteBId) ?? null,
          keyGroupId: fight.keyGroupId,
          orderIndex: fight.orderIndex,
        };
      })
      .filter((item): item is AreaQueueFightView => item !== null);

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
