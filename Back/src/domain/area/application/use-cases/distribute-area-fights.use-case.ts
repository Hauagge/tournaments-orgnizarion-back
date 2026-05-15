import { Inject, Injectable } from '@nestjs/common';
import { EventBus } from '@/core/events/event-bus.interface';
import { IAthleteRepository } from '@/domain/athlete/repository/IAthleteRepository.repository';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';
import { IFightRepository } from '@/domain/fight/repository/IFightRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { IAreaRepository } from '../../repository/IAreaRepository.repository';
import { FightQueuePlannerService } from '../services/fight-queue-planner.service';
import { FightQueueWriterService } from '../services/fight-queue-writer.service';

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

    const plan = this.fightQueuePlannerService.plan({
      competitionId: input.competitionId,
      competitionMode: competition.mode,
      ageSplitYears: input.ageSplitYears ?? competition.ageSplitYears,
      areas: areas.map((area) => ({ id: area.id as number, order: area.order })),
      distributableFights,
      recentFinishedFights: fights.filter((fight) => fight.status === FightStatus.FINISHED),
      restGapFights: input.restGapFights,
      athleteBirthDatesById,
    });

    const savedQueueItems = await this.fightQueueWriterService.applyFull({
      competitionId: input.competitionId,
      plan,
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
      areas: areas.map((area) => ({
        id: area.id as number,
        name: area.name,
        order: area.order,
        queuedFights:
          plan.areas.find((item) => item.areaId === (area.id as number))?.queuedFights ?? 0,
      })),
    };
  }
}
