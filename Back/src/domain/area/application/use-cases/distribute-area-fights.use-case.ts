import { Inject, Injectable } from '@nestjs/common';
import { EventBus } from '@/core/events/event-bus.interface';
import { IAthleteRepository } from '@/domain/athlete/repository/IAthleteRepository.repository';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';
import { IFightRepository } from '@/domain/fight/repository/IFightRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { AreaQueueItem } from '../../domain/entities/area-queue-item.entity';
import { IAreaRepository } from '../../repository/IAreaRepository.repository';
import { IAreaQueueItemRepository } from '../../repository/IAreaQueueItemRepository.repository';
import { RestPolicyService } from '../services/rest-policy.service';
import { AreaDistributionStrategy } from '../strategies/area-distribution.strategy';

export type DistributeAreaFightsInput = {
  competitionId: number;
  ageSplitYears?: number;
  restGapFights: number;
};

@Injectable()
export class DistributeAreaFightsUseCase {
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
    private readonly areaDistributionStrategy: AreaDistributionStrategy,
    private readonly restPolicyService: RestPolicyService,
    @Inject(EventBus)
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: DistributeAreaFightsInput) {
    const competition = await this.competitionRepository.findById(input.competitionId);

    if (!competition) {
      throw new NotFoundError(`Competition with id ${input.competitionId} not found`);
    }

    const [areas, fights] = await Promise.all([
      this.areaRepository.listByCompetitionId(input.competitionId),
      this.fightRepository.listByCompetitionId({ competitionId: input.competitionId }),
    ]);

    if (areas.length === 0) {
      throw new ValidationError('No areas configured for this competition');
    }

    const distributableFights = fights.filter(
      (fight) => fight.status === FightStatus.WAITING || fight.status === FightStatus.CALLED,
    );
    const athleteIds = Array.from(
      new Set(distributableFights.flatMap((fight) => [fight.athleteAId, fight.athleteBId])),
    );
    const athletes = await this.athleteRepository.findByIds(athleteIds);
    const athleteBirthDatesById = new Map(
      athletes.map((athlete) => [athlete.id as number, athlete.birthDate]),
    );

    const distributed = this.areaDistributionStrategy.distribute({
      competitionId: input.competitionId,
      ageSplitYears: input.ageSplitYears ?? competition.ageSplitYears,
      areas: areas.map((area) => ({ id: area.id as number, order: area.order })),
      fights: distributableFights,
      athleteBirthDatesById,
    });

    const recentFinishedFights = fights.filter((fight) => fight.status === FightStatus.FINISHED);
    const queueItems: AreaQueueItem[] = [];
    const fightAssignments: Array<{ fightId: number; areaId: number }> = [];

    for (const areaDistribution of distributed) {
      const orderedGroups = this.restPolicyService.apply({
        groups: areaDistribution.groups,
        recentFinishedFights,
        restGapFights: input.restGapFights,
      });

      let position = 1;
      for (const group of orderedGroups) {
        for (const fight of group.fights.sort((a, b) => a.orderIndex - b.orderIndex)) {
          queueItems.push(
            AreaQueueItem.create({
              areaId: areaDistribution.areaId,
              fightId: fight.id as number,
              position: position++,
            }),
          );
          fightAssignments.push({
            fightId: fight.id as number,
            areaId: areaDistribution.areaId,
          });
        }
      }
    }

    await this.fightRepository.assignAreas(
      fightAssignments.map((assignment) => ({ ...assignment, areaId: assignment.areaId })),
    );
    const savedQueueItems = await this.areaQueueItemRepository.replaceForCompetition({
      competitionId: input.competitionId,
      items: queueItems,
    });

    await this.eventBus.publish({
      name: 'queue.updated',
      payload: {
        competitionId: input.competitionId,
        areaIds: areas.map((area) => area.id as number),
        queueItems: savedQueueItems.length,
      },
      occurredAt: new Date(),
    });

    return {
      totalDistributed: savedQueueItems.length,
      areas: await Promise.all(
        areas.map(async (area) => ({
          id: area.id as number,
          name: area.name,
          order: area.order,
          queuedFights: (await this.areaQueueItemRepository.listByAreaId(area.id as number)).length,
        })),
      ),
    };
  }
}
