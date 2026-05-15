import { Injectable } from '@nestjs/common';
import { FightEntity } from '@/domain/fight/domain/entities/fight.entity';
import { AreaQueueItem } from '../../domain/entities/area-queue-item.entity';
import { AreaDistributionStrategyResolverService } from './area-distribution-strategy-resolver.service';
import { RestPolicyService } from './rest-policy.service';
import { FightQueuePlan } from '../types/fight-queue-plan.type';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { DistributionMode } from '../value-objects/distribution-mode.enum';

@Injectable()
export class FightQueuePlannerService {
  constructor(
    private readonly areaDistributionStrategyResolver: AreaDistributionStrategyResolverService,
    private readonly restPolicyService: RestPolicyService,
  ) {}

  plan(input: {
    competitionId: number;
    competitionMode: CompetitionMode;
    distributionMode: DistributionMode;
    ageSplitYears: number;
    restGapFights: number;
    areas: Array<{ id: number; order: number }>;
    distributableFights: FightEntity[];
    recentFinishedFights: FightEntity[];
    athleteBirthDatesById: Map<number, Date>;
    existingQueueItemsByArea?: Map<number, AreaQueueItem[]>;
  }): FightQueuePlan {
    const areaDistributionStrategy = this.areaDistributionStrategyResolver.resolve(
      input.competitionMode,
    );

    const distributed = areaDistributionStrategy.distribute({
      competitionId: input.competitionId,
      ageSplitYears: input.ageSplitYears,
      areas: input.areas,
      fights: input.distributableFights,
      athleteBirthDatesById: input.athleteBirthDatesById,
    });

    const queueItems: AreaQueueItem[] = [];
    const assignments: FightQueuePlan['assignments'] = [];
    const areas: FightQueuePlan['areas'] = [];

    for (const areaDistribution of distributed) {
      const existingItems =
        input.distributionMode === DistributionMode.INCREMENTAL
          ? (input.existingQueueItemsByArea?.get(areaDistribution.areaId) ?? [])
          : [];
      const orderedGroups = this.restPolicyService.apply({
        groups: areaDistribution.groups,
        recentFinishedFights: input.recentFinishedFights,
        restGapFights: input.restGapFights,
      });

      let position =
        existingItems.length > 0
          ? Math.max(...existingItems.map((item) => item.position)) + 1
          : 1;
      for (const group of orderedGroups) {
        for (const fight of group.fights.sort((a, b) => a.orderIndex - b.orderIndex)) {
          queueItems.push(
            AreaQueueItem.create({
              areaId: areaDistribution.areaId,
              fightId: fight.id as number,
              position: position++,
            }),
          );
          assignments.push({
            fightId: fight.id as number,
            areaId: areaDistribution.areaId,
          });
        }
      }

      areas.push({
        areaId: areaDistribution.areaId,
        queuedFights: existingItems.length + queueItems.filter(
          (item) => item.areaId === areaDistribution.areaId,
        ).length,
      });
    }

    return {
      assignments,
      queueItems,
      areas,
    };
  }
}
