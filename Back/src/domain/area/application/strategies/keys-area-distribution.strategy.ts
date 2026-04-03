import { Injectable } from '@nestjs/common';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { ValidationError } from '@/shared/errors/validation.error';
import {
  AreaDistributionContext,
  AreaDistributionResult,
  AreaDistributionStrategy,
  FightQueueGroup,
} from './area-distribution.strategy';

@Injectable()
export class KeysAreaDistributionStrategy implements AreaDistributionStrategy {
  readonly mode = CompetitionMode.KEYS;

  distribute(context: AreaDistributionContext): AreaDistributionResult {
    if (context.areas.length === 0) {
      throw new ValidationError('At least one area is required for distribution');
    }

    const groups = this.buildGroups(context);
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

    let cursor = 0;

    for (const group of groups) {
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

  private buildGroups(context: AreaDistributionContext): FightQueueGroup[] {
    const grouped = new Map<string, FightQueueGroup>();

    for (const fight of context.fights) {
      const key =
        fight.keyGroupId !== null ? `key-group:${fight.keyGroupId}` : `fight:${fight.id}`;
      const current = grouped.get(key);

      if (current) {
        current.fights.push(fight);
        current.athleteIds = Array.from(
          new Set([...current.athleteIds, fight.athleteAId, fight.athleteBId]),
        );
        continue;
      }

      grouped.set(key, {
        key,
        fights: [fight],
        athleteIds: [fight.athleteAId, fight.athleteBId],
        representativeFight: fight,
        preferredAreaId: fight.areaId,
      });
    }

    return Array.from(grouped.values()).sort((left, right) => {
      const leftKeyGroupId = left.representativeFight.keyGroupId ?? Number.MAX_SAFE_INTEGER;
      const rightKeyGroupId =
        right.representativeFight.keyGroupId ?? Number.MAX_SAFE_INTEGER;

      return (
        leftKeyGroupId - rightKeyGroupId ||
        left.representativeFight.orderIndex - right.representativeFight.orderIndex ||
        (left.representativeFight.id ?? 0) - (right.representativeFight.id ?? 0)
      );
    });
  }
}
