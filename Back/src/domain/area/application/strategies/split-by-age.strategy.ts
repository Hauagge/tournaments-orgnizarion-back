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
      throw new ValidationError('At least one area is required for distribution');
    }

    const groups = this.buildGroups(context.fights);
    const distributions = context.areas
      .slice()
      .sort((left, right) => left.order - right.order)
      .map((area) => ({
        areaId: area.id,
        groups: [] as FightQueueGroup[],
      }));

    if (groups.length === 0) {
      return distributions;
    }

    const sortedGroups = groups
      .slice()
      .sort((left, right) => {
        const leftBand = this.calculateAgeBand(left, context);
        const rightBand = this.calculateAgeBand(right, context);

        return (
          leftBand - rightBand ||
          this.maxAge(left, context) - this.maxAge(right, context) ||
          left.representativeFight.orderIndex - right.representativeFight.orderIndex ||
          (left.representativeFight.id ?? 0) - (right.representativeFight.id ?? 0)
        );
      });

    let cursor = 0;

    for (const group of sortedGroups) {
      if (group.preferredAreaId) {
        const preferred = distributions.find(
          (distribution) => distribution.areaId === group.preferredAreaId,
        );

        if (preferred) {
          preferred.groups.push(group);
          continue;
        }
      }

      distributions[cursor].groups.push(group);
      cursor = (cursor + 1) % distributions.length;
    }

    return distributions;
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

  private maxAge(
    group: FightQueueGroup,
    context: AreaDistributionContext,
  ): number {
    return Math.max(
      ...group.athleteIds.map((athleteId) =>
        this.calculateAge(context.athleteBirthDatesById.get(athleteId)),
      ),
    );
  }

  private calculateAgeBand(
    group: FightQueueGroup,
    context: AreaDistributionContext,
  ): number {
    const maxAge = this.maxAge(group, context);

    if (!Number.isFinite(maxAge)) {
      return Number.MAX_SAFE_INTEGER;
    }

    return Math.floor(maxAge / Math.max(context.ageSplitYears, 1));
  }
}
