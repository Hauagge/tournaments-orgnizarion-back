import { Inject, Injectable } from '@nestjs/common';
import { IAreaQueueTransaction } from '../../repository/IAreaQueueTransaction.repository';
import { FightQueuePlan } from '../types/fight-queue-plan.type';

@Injectable()
export class FightQueueWriterService {
  constructor(
    @Inject(IAreaQueueTransaction)
    private readonly areaQueueTransaction: IAreaQueueTransaction,
  ) {}

  async applyFull(input: { competitionId: number; plan: FightQueuePlan }) {
    return this.areaQueueTransaction.run(async ({ areaQueueItems, fights }) => {
      await fights.assignAreas(input.plan.assignments);

      return areaQueueItems.replaceForCompetition({
        competitionId: input.competitionId,
        items: input.plan.queueItems,
      });
    });
  }

  async applyIncremental(plan: FightQueuePlan) {
    return this.areaQueueTransaction.run(async ({ areaQueueItems, fights }) => {
      await fights.assignAreas(plan.assignments);

      return areaQueueItems.createManyQueueItems(plan.queueItems);
    });
  }
}
