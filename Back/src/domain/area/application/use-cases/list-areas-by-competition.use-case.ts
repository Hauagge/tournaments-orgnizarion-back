import { Inject, Injectable } from '@nestjs/common';
import { IAthleteRepository } from '@/domain/athlete/repository/IAthleteRepository.repository';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';
import { IFightRepository } from '@/domain/fight/repository/IFightRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { AreaQueueItemStatus } from '../../domain/value-objects/area-queue-item-status.enum';
import { IAreaRepository } from '../../repository/IAreaRepository.repository';
import { IAreaQueueItemRepository } from '../../repository/IAreaQueueItemRepository.repository';
import { AreaListFightView, AreaListItemView } from './area-list-item.view';

@Injectable()
export class ListAreasByCompetitionUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(IAreaRepository)
    private readonly areaRepository: IAreaRepository,
    @Inject(IAreaQueueItemRepository)
    private readonly areaQueueItemRepository: IAreaQueueItemRepository,
    @Inject(IFightRepository)
    private readonly fightRepository: IFightRepository,
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
  ) {}

  async execute(competitionId: number): Promise<AreaListItemView[]> {
    const competition = await this.competitionRepository.findById(competitionId);

    if (!competition) {
      throw new NotFoundError(`Competition with id ${competitionId} not found`);
    }

    const areas = await this.areaRepository.listByCompetitionId(competitionId);

    return Promise.all(
      areas.map(async (area) => {
        const [items, fights] = await Promise.all([
          this.areaQueueItemRepository.listByAreaId(area.id as number),
          this.fightRepository.listQueueByAreaId(area.id as number),
        ]);

        const athleteIds = Array.from(
          new Set(fights.flatMap((fight) => [fight.athleteAId, fight.athleteBId])),
        );
        const athletes = await this.athleteRepository.findByIds(athleteIds);
        const athleteNamesById = new Map(
          athletes.map((athlete) => [athlete.id as number, athlete.fullName]),
        );
        const queueItemByFightId = new Map(items.map((item) => [item.fightId, item]));

        const fightViews: AreaListFightView[] = fights.map((fight) => {
          const queueItem = queueItemByFightId.get(fight.id as number);

          return {
            queueItemId: queueItem?.id as number | undefined,
            fightId: fight.id as number,
            position: queueItem?.position,
            queueStatus: queueItem?.status,
            fightStatus: fight.status,
            athleteAId: fight.athleteAId,
            athleteAName: athleteNamesById.get(fight.athleteAId) ?? null,
            athleteBId: fight.athleteBId,
            athleteBName: athleteNamesById.get(fight.athleteBId) ?? null,
            keyGroupId: fight.keyGroupId,
            orderIndex: fight.orderIndex,
          };
        });

        const currentFight =
          fightViews.find(
            (fight) =>
              fight.fightStatus === FightStatus.IN_PROGRESS ||
              fight.queueStatus === AreaQueueItemStatus.CALLED,
          ) ?? null;

        const nextFight =
          fightViews.find(
            (fight) =>
              fight.queueStatus === AreaQueueItemStatus.QUEUED &&
              fight.fightStatus === FightStatus.WAITING,
          ) ?? null;

        const queue = fightViews.filter(
          (fight) => fight.queueStatus === AreaQueueItemStatus.QUEUED,
        );

        return {
          id: area.id as number,
          name: area.name,
          queueCount: queue.length,
          queuedFights: items.filter((item) => item.status === AreaQueueItemStatus.QUEUED)
            .length,
          fightCount: fightViews.length,
          next: nextFight,
          currentFight,
          queue,
          fights: fightViews,
        };
      }),
    );
  }
}
