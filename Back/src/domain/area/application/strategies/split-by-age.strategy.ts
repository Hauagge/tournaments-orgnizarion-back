import { Injectable } from '@nestjs/common';
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
  distribute(context: AreaDistributionContext): AreaDistributionResult {
    if (context.areas.length === 0) {
      throw new ValidationError('At least one area is required for distribution');
    }

    const groups = this.buildGroups(context.fights);
    if (groups.length === 0) {
      return context.areas.map((area) => ({ areaId: area.id, groups: [] }));
    }

    if (context.areas.length === 1) {
      return [{ areaId: context.areas[0].id, groups }];
    }

    const youngerArea = context.areas[0];
    const olderArea = context.areas[1];
    const youngerGroups: FightQueueGroup[] = [];
    const olderGroups: FightQueueGroup[] = [];

    for (const group of groups) {
      if (group.preferredAreaId) {
        const targetArea = context.areas.find((area) => area.id === group.preferredAreaId);
        if (targetArea) {
          const bucket = targetArea.id === youngerArea.id ? youngerGroups : olderGroups;
          bucket.push(group);
          continue;
        }
      }

      const maxAge = Math.max(
        ...group.athleteIds.map((athleteId) =>
          this.calculateAge(
            context.athleteBirthDatesById.get(athleteId),
          ),
        ),
      );

      if (maxAge <= context.ageSplitYears) {
        youngerGroups.push(group);
      } else {
        olderGroups.push(group);
      }
    }

    return [
      { areaId: youngerArea.id, groups: youngerGroups },
      { areaId: olderArea.id, groups: olderGroups },
      ...context.areas.slice(2).map((area) => ({ areaId: area.id, groups: [] })),
    ];
  }

  private buildGroups(fights: FightEntity[]): FightQueueGroup[] {
    const grouped = new Map<string, FightEntity[]>();

    for (const fight of fights) {
      const key =
        fight.keyGroupId !== null ? `key-group:${fight.keyGroupId}` : `fight:${fight.id}`;
      const current = grouped.get(key) ?? [];
      current.push(fight);
      grouped.set(key, current);
    }

    return Array.from(grouped.entries()).map(([key, items]) => ({
      key,
      fights: items,
      athleteIds: Array.from(
        new Set(items.flatMap((fight) => [fight.athleteAId, fight.athleteBId])),
      ),
      representativeFight: items[0],
      preferredAreaId: items[0].areaId,
    }));
  }

  private calculateAge(birthDate: Date | undefined): number {
    if (!birthDate) {
      return Number.MAX_SAFE_INTEGER;
    }

    const now = new Date();
    let age = now.getFullYear() - birthDate.getFullYear();
    const monthDiff = now.getMonth() - birthDate.getMonth();
    const dayDiff = now.getDate() - birthDate.getDate();

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age -= 1;
    }

    return age;
  }
}
