import { Injectable } from '@nestjs/common';
import { FightEntity } from '@/domain/fight/domain/entities/fight.entity';
import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';
import { FightQueueGroup } from '../strategies/area-distribution.strategy';

@Injectable()
export class RestPolicyService {
  apply(input: {
    groups: FightQueueGroup[];
    recentFinishedFights: FightEntity[];
    restGapFights: number;
  }): FightQueueGroup[] {
    if (input.restGapFights <= 0 || input.groups.length <= 1) {
      return input.groups;
    }

    const recentAthleteWindows = new Map<number, number>();
    const history = [...input.recentFinishedFights]
      .filter((fight) => fight.status === FightStatus.FINISHED)
      .sort(
        (a, b) =>
          (b.finishedAt?.getTime() ?? 0) - (a.finishedAt?.getTime() ?? 0),
      );

    for (const fight of history.slice(0, 2)) {
      for (const athleteId of [fight.athleteAId, fight.athleteBId]) {
        recentAthleteWindows.set(
          athleteId,
          Math.max(recentAthleteWindows.get(athleteId) ?? 0, input.restGapFights),
        );
      }
    }

    const pending = [...input.groups];
    const scheduled: FightQueueGroup[] = [];

    while (pending.length > 0) {
      const candidateIndex = pending.findIndex((group) =>
        group.athleteIds.every((athleteId) => (recentAthleteWindows.get(athleteId) ?? 0) === 0),
      );

      const [nextGroup] = pending.splice(candidateIndex >= 0 ? candidateIndex : 0, 1);
      scheduled.push(nextGroup);

      for (const [athleteId, remaining] of Array.from(recentAthleteWindows.entries())) {
        if (remaining <= 1) {
          recentAthleteWindows.delete(athleteId);
        } else {
          recentAthleteWindows.set(athleteId, remaining - 1);
        }
      }

      for (const athleteId of nextGroup.athleteIds) {
        recentAthleteWindows.set(athleteId, input.restGapFights);
      }
    }

    return scheduled;
  }
}
