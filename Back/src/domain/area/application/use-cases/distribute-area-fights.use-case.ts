import { Inject, Injectable } from '@nestjs/common';
import { EventBus } from '@/core/events/event-bus.interface';
import { IAthleteRepository } from '@/domain/athlete/repository/IAthleteRepository.repository';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';
import { IFightRepository } from '@/domain/fight/repository/IFightRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { IAreaRepository } from '../../repository/IAreaRepository.repository';
import { IAreaQueueItemRepository } from '../../repository/IAreaQueueItemRepository.repository';
import { FightQueuePlannerService } from '../services/fight-queue-planner.service';
import { FightQueueWriterService } from '../services/fight-queue-writer.service';
import { DistributionMode } from '../value-objects/distribution-mode.enum';

export type DistributeAreaFightsInput = {
  competitionId: number;
  mode: DistributionMode;
  ageSplitYears?: number;
  restGapFights: number;
  fightIds?: number[];
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
    private readonly fightQueuePlannerService: FightQueuePlannerService,
    private readonly fightQueueWriterService: FightQueueWriterService,
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

    this.assertFullDistributionSafety(input.mode, fights);
    this.assertIncrementalDistributionSafety(input.mode, fights, input.fightIds);

    const candidateFights = fights.filter(
      (fight) => fight.status === FightStatus.WAITING,
    );
    const distributableFights =
      input.mode === DistributionMode.FULL
        ? candidateFights
        : await this.resolveIncrementalFights({
            candidateFights,
            fightIds: input.fightIds,
          });

    if (input.mode === DistributionMode.INCREMENTAL && distributableFights.length === 0) {
      return {
        totalDistributed: 0,
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

    const athleteIds = Array.from(
      new Set(distributableFights.flatMap((fight) => [fight.athleteAId, fight.athleteBId])),
    );
    const athletes = await this.athleteRepository.findByIds(athleteIds);
    const athleteBirthDatesById = new Map(
      athletes.map((athlete) => [athlete.id as number, athlete.birthDate]),
    );

    const plan = this.fightQueuePlannerService.plan({
      competitionId: input.competitionId,
      competitionMode: competition.mode,
      distributionMode: input.mode,
      ageSplitYears: input.ageSplitYears ?? competition.ageSplitYears,
      areas: areas.map((area) => ({ id: area.id as number, order: area.order })),
      distributableFights,
      recentFinishedFights: fights.filter((fight) => fight.status === FightStatus.FINISHED),
      restGapFights: input.restGapFights,
      athleteBirthDatesById,
      existingQueueItemsByArea:
        input.mode === DistributionMode.INCREMENTAL
          ? new Map(
              await Promise.all(
                areas.map(async (area) => [
                  area.id as number,
                  await this.areaQueueItemRepository.listByAreaId(area.id as number),
                ] as const),
              ),
            )
          : undefined,
    });

    const savedQueueItems =
      input.mode === DistributionMode.FULL
        ? await this.fightQueueWriterService.applyFull({
            competitionId: input.competitionId,
            plan,
          })
        : await this.fightQueueWriterService.applyIncremental(plan);

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
      areas: areas.map((area) => ({
        id: area.id as number,
        name: area.name,
        order: area.order,
        queuedFights:
          plan.areas.find((item) => item.areaId === (area.id as number))?.queuedFights ?? 0,
      })),
    };
  }

  private async resolveIncrementalFights(input: {
    candidateFights: Awaited<ReturnType<IFightRepository['listByCompetitionId']>>;
    fightIds?: number[];
  }) {
    const targetedFightIds = input.fightIds?.length
      ? new Set(input.fightIds)
      : null;

    const fights = targetedFightIds
      ? input.candidateFights.filter((fight) => targetedFightIds.has(fight.id as number))
      : input.candidateFights;

    const queueChecks = await Promise.all(
      fights.map(async (fight) => ({
        fight,
        queueItem: await this.areaQueueItemRepository.findByFightId(fight.id as number),
      })),
    );

    return queueChecks
      .filter(({ fight, queueItem }) => queueItem === null || fight.areaId === null)
      .map(({ fight }) => fight);
  }

  private assertFullDistributionSafety(
    mode: DistributionMode,
    fights: Awaited<ReturnType<IFightRepository['listByCompetitionId']>>,
  ) {
    if (mode !== DistributionMode.FULL) {
      return;
    }

    const lockedFights = fights.filter((fight) =>
      [FightStatus.CALLED, FightStatus.IN_PROGRESS].includes(fight.status),
    );

    if (lockedFights.length > 0) {
      throw new ValidationError(
        'Full distribution is blocked while there are called or in-progress fights',
      );
    }
  }

  private assertIncrementalDistributionSafety(
    mode: DistributionMode,
    fights: Awaited<ReturnType<IFightRepository['listByCompetitionId']>>,
    fightIds?: number[],
  ) {
    if (mode !== DistributionMode.INCREMENTAL || !fightIds?.length) {
      return;
    }

    const targetedFightIds = new Set(fightIds);
    const lockedTargetFights = fights.filter(
      (fight) =>
        targetedFightIds.has(fight.id as number) &&
        [FightStatus.CALLED, FightStatus.IN_PROGRESS].includes(fight.status),
    );

    if (lockedTargetFights.length > 0) {
      throw new ValidationError(
        'Incremental distribution cannot target called or in-progress fights',
      );
    }
  }
}
