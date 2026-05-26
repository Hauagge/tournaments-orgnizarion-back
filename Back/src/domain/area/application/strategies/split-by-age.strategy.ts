import { Injectable } from '@nestjs/common';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { FightEntity } from '@/domain/fight/domain/entities/fight.entity';
import { ValidationError } from '@/shared/errors/validation.error';
import {
  AreaDistributionContext,
  AreaDistributionResult,
  AreaDistributionStrategy,
  FightQueueGroup,
} from './area-distribution.strategy';

@Injectable()
export class SplitByAgeStrategy implements AreaDistributionStrategy {
  readonly mode = CompetitionMode.ABSOLUTE_GP;

  distribute(context: AreaDistributionContext): AreaDistributionResult {
    if (context.areas.length === 0) {
      throw new ValidationError(
        'At least one area is required for distribution',
      );
    }

    const groups = this.buildGroups(context.fights);
    const orderedAreas = context.areas
      .slice()
      .sort((left, right) => left.order - right.order || left.id - right.id);
    const distributions = orderedAreas.map((area) => ({
      areaId: area.id,
      groups: [] as FightQueueGroup[],
    }));

    if (groups.length === 0) {
      return distributions;
    }

    const sortedGroups = groups.slice().sort((left, right) => {
      return (
        right.fights.length - left.fights.length ||
        left.representativeFight.orderIndex -
          right.representativeFight.orderIndex ||
        (left.representativeFight.id ?? 0) - (right.representativeFight.id ?? 0)
      );
    });

    const loads = new Map<number, number>(
      orderedAreas.map((area) => [area.id, 0]),
    );

    for (const group of sortedGroups) {
      if (group.preferredAreaId) {
        const preferred = distributions.find(
          (distribution) => distribution.areaId === group.preferredAreaId,
        );

        if (preferred) {
          preferred.groups.push(group);
          loads.set(
            preferred.areaId,
            (loads.get(preferred.areaId) ?? 0) + group.fights.length,
          );
          continue;
        }
      }

      const selected = distributions.slice().sort((left, right) => {
        const leftLoad = loads.get(left.areaId) ?? 0;
        const rightLoad = loads.get(right.areaId) ?? 0;

        return leftLoad - rightLoad || left.areaId - right.areaId;
      })[0];

      selected.groups.push(group);
      loads.set(
        selected.areaId,
        (loads.get(selected.areaId) ?? 0) + group.fights.length,
      );
    }

    return distributions;
  }

  private buildGroups(fights: FightEntity[]): FightQueueGroup[] {
    const grouped = new Map<string, FightEntity[]>();

    for (const fight of fights) {
      const key = this.groupKey(fight);
      const current = grouped.get(key) ?? [];
      current.push(fight);
      grouped.set(key, current);
    }

    return Array.from(grouped.entries()).map(([key, items]) => {
      const preferredAreaIds = new Set(
        items
          .map((fight) => fight.areaId)
          .filter((areaId): areaId is number => areaId !== null),
      );

      return {
        key,
        fights: items,
        athleteIds: Array.from(
          new Set(
            items.flatMap((fight) => [fight.athleteAId, fight.athleteBId]),
          ),
        ),
        representativeFight: items[0],
        preferredAreaId:
          preferredAreaIds.size === 1 ? Array.from(preferredAreaIds)[0] : null,
      };
    });
  }

  private groupKey(fight: FightEntity): string {
    if (fight.categoryId !== null) {
      return `category:${fight.categoryId}`;
    }

    if (fight.keyGroupId !== null) {
      return `key-group:${fight.keyGroupId}`;
    }

    return `fight:${fight.id}`;
  }
}
