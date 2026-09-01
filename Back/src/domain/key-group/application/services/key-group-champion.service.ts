import { Injectable } from '@nestjs/common';
import { FightEntity } from '@/domain/fight/domain/entities/fight.entity';
import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';

/**
 * Decide o campeao de uma chave a partir das suas lutas. So responde quando a
 * chave esta inteira decidida; enquanto houver luta em aberto devolve null.
 */
@Injectable()
export class KeyGroupChampionService {
  resolve(fights: FightEntity[]): number | null {
    const activeFights = fights.filter(
      (fight) => fight.status !== FightStatus.CANCELED,
    );

    if (activeFights.length === 0) {
      return null;
    }

    const isDecided = activeFights.every(
      (fight) => fight.status === FightStatus.FINISHED,
    );

    if (!isDecided) {
      return null;
    }

    const lastRound = Math.max(...activeFights.map((fight) => fight.round));

    if (lastRound > 1) {

      const titleFight = this.resolveTitleFight(activeFights);
      const finalFight =
        titleFight !== null && titleFight.round === lastRound
          ? titleFight
          : activeFights
              .filter((fight) => fight.round === lastRound)
              .sort((left, right) => left.order - right.order)[0];

      return finalFight?.winnerId ?? null;
    }

    return this.resolveByWins(activeFights);
  }

  private resolveTitleFight(fights: FightEntity[]): FightEntity | null {
    const fightsById = new Map(
      fights.map((fight) => [fight.id as number, fight]),
    );
    let titleFight: FightEntity | null = null;

    for (const firstRoundFight of fights.filter((fight) => fight.round === 1)) {
      let current = firstRoundFight;
      const visited = new Set<number>([current.id as number]);

      while (current.nextFightId !== null) {
        const next = fightsById.get(current.nextFightId);

        if (!next || visited.has(next.id as number)) {
          break;
        }

        visited.add(next.id as number);
        current = next;
      }

      if (titleFight === null || current.round > titleFight.round) {
        titleFight = current;
      }
    }

    return titleFight;
  }

  private resolveByWins(fights: FightEntity[]): number | null {
    const winsByAthlete = new Map<number, number>();

    for (const fight of fights) {
      for (const athleteId of [fight.athleteAId, fight.athleteBId]) {
        if (athleteId !== null && !winsByAthlete.has(athleteId)) {
          winsByAthlete.set(athleteId, 0);
        }
      }
    }

    for (const fight of fights) {
      if (fight.winnerId === null) {
        continue;
      }

      winsByAthlete.set(
        fight.winnerId,
        (winsByAthlete.get(fight.winnerId) ?? 0) + 1,
      );
    }

    const ranked = Array.from(winsByAthlete.entries()).sort(
      (left, right) => right[1] - left[1],
    );

    if (ranked.length === 0) {
      return null;
    }

    const [[championId, championWins]] = ranked;
    const isTied = ranked.filter(([, wins]) => wins === championWins).length > 1;

    return isTied ? null : championId;
  }
}
