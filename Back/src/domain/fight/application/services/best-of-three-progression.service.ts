import { Injectable } from '@nestjs/common';
import { FightEntity } from '../../domain/entities/fight.entity';
import { FightStatus } from '../../domain/value-objects/fight-status.enum';

@Injectable()
export class BestOfThreeProgressionService {
  shouldCreateThirdFight(fights: FightEntity[]): boolean {
    if (fights.length !== 2) {
      return false;
    }

    const sortedFights = [...fights].sort(
      (left, right) => left.orderIndex - right.orderIndex,
    );
    const athletePairs = sortedFights.map((fight) =>
      [fight.athleteAId, fight.athleteBId]
        .filter((athleteId): athleteId is number => athleteId !== null)
        .sort((left, right) => left - right)
        .join(':'),
    );

    if (new Set(athletePairs).size !== 1) {
      return false;
    }

    const finishedFights = sortedFights.filter(
      (fight) => fight.status === FightStatus.FINISHED,
    );
    if (finishedFights.length !== 2) {
      return false;
    }

    const winsByAthleteId = new Map<number, number>();
    for (const fight of finishedFights) {
      if (fight.winnerId === null) {
        return false;
      }

      winsByAthleteId.set(
        fight.winnerId,
        (winsByAthleteId.get(fight.winnerId) ?? 0) + 1,
      );
    }

    return (
      winsByAthleteId.size === 2 &&
      Array.from(winsByAthleteId.values()).every((wins) => wins === 1)
    );
  }
}
