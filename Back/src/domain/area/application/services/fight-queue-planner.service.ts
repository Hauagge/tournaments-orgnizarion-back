import { Injectable } from '@nestjs/common';
import { AreaQueueItemStatus } from '../../domain/value-objects/area-queue-item-status.enum';
import { FightEntity } from '@/domain/fight/domain/entities/fight.entity';
import { AreaQueueItem } from '../../domain/entities/area-queue-item.entity';
import { AreaDistributionStrategyResolverService } from './area-distribution-strategy-resolver.service';
import { RestPolicyService } from './rest-policy.service';
import { FightQueuePlan } from '../types/fight-queue-plan.type';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { DistributionMode } from '../value-objects/distribution-mode.enum';
import { FightQueueGroup } from '../strategies/area-distribution.strategy';

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
    const fightsForDistribution =
      input.distributionMode === DistributionMode.FULL
        ? input.distributableFights.map((fight) => fight.assignArea(null))
        : input.distributableFights;

    const distributed = areaDistributionStrategy.distribute({
      competitionId: input.competitionId,
      ageSplitYears: input.ageSplitYears,
      areas: input.areas,
      fights: fightsForDistribution,
      athleteBirthDatesById: input.athleteBirthDatesById,
    });
    const plannedDistributions =
      input.distributionMode === DistributionMode.INCREMENTAL
        ? this.redistributeIncrementalGroups(
            distributed,
            input.areas,
            input.existingQueueItemsByArea,
          )
        : distributed;

    const queueItems: AreaQueueItem[] = [];
    const assignments: FightQueuePlan['assignments'] = [];
    const areas: FightQueuePlan['areas'] = [];

    for (const areaDistribution of plannedDistributions) {
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

  private redistributeIncrementalGroups(
    distributions: Array<{ areaId: number; groups: FightQueueGroup[] }>,
    areas: Array<{ id: number; order: number }>,
    existingQueueItemsByArea?: Map<number, AreaQueueItem[]>,
  ): Array<{ areaId: number; groups: FightQueueGroup[] }> {
    const loads = new Map<number, number>(
      areas.map((area) => [
        area.id,
        (existingQueueItemsByArea?.get(area.id) ?? []).filter(
          (item) => item.status !== AreaQueueItemStatus.DONE,
        ).length,
      ]),
    );
    const reassigned = new Map<number, FightQueueGroup[]>(
      areas.map((area) => [area.id, []]),
    );
    const flattenedGroups = distributions.flatMap((distribution) => distribution.groups);

    for (const group of flattenedGroups) {
      const preferredAreaId = group.preferredAreaId ?? null;
      const selectedArea =
        preferredAreaId !== null && reassigned.has(preferredAreaId)
          ? areas.find((area) => area.id === preferredAreaId) ?? null
          : areas
              .slice()
              .sort((left, right) => {
                const leftLoad = loads.get(left.id) ?? 0;
                const rightLoad = loads.get(right.id) ?? 0;

                return leftLoad - rightLoad || left.order - right.order || left.id - right.id;
              })[0];

      if (!selectedArea) {
        continue;
      }

      reassigned.get(selectedArea.id)?.push(group);
      loads.set(
        selectedArea.id,
        (loads.get(selectedArea.id) ?? 0) + group.fights.length,
      );
    }

    return areas
      .slice()
      .sort((left, right) => left.order - right.order || left.id - right.id)
      .map((area) => ({
        areaId: area.id,
        groups: reassigned.get(area.id) ?? [],
      }));
  }
}
