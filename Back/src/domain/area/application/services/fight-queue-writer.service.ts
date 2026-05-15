import { Inject, Injectable } from '@nestjs/common';
import { IFightRepository } from '@/domain/fight/repository/IFightRepository.repository';
import { IAreaQueueItemRepository } from '../../repository/IAreaQueueItemRepository.repository';
import { FightQueuePlan } from '../types/fight-queue-plan.type';

@Injectable()
export class FightQueueWriterService {
  constructor(
    @Inject(IFightRepository)
    private readonly fightRepository: IFightRepository,
    @Inject(IAreaQueueItemRepository)
    private readonly areaQueueItemRepository: IAreaQueueItemRepository,
  ) {}

  async applyFull(input: {
    competitionId: number;
    plan: FightQueuePlan;
  }) {
    await this.fightRepository.assignAreas(input.plan.assignments);

    return this.areaQueueItemRepository.replaceForCompetition({
      competitionId: input.competitionId,
      items: input.plan.queueItems,
    });
  }

  async applyIncremental(plan: FightQueuePlan) {
    await this.fightRepository.assignAreas(plan.assignments);

    return this.areaQueueItemRepository.createManyQueueItems(plan.queueItems);
  }
}
