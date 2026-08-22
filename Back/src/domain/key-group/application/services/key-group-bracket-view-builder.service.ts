import { Injectable } from '@nestjs/common';
import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';
import { KeyGroupBracketFormat } from '../../domain/value-objects/key-group-bracket-format.enum';
import {
  KeyGroupDetailsFightView,
  KeyGroupDetailsView,
} from '../../repository/IKeyGroupRepository.repository';

export type KeyGroupBracketFightView = Omit<
  KeyGroupDetailsFightView,
  'id'
> & {
  id: number | null;
  enabled: boolean;
};

export type KeyGroupBracketPhaseView = {
  phase: string;
  round: number;
  order: number;
  fights: KeyGroupBracketFightView[];
};

export type KeyGroupStandingView = {
  athleteId: number;
  athleteName: string;
  wins: number;
  losses: number;
  points: number;
};

export type KeyGroupBracketView = {
  bracketFormat: KeyGroupBracketFormat;
  phases: KeyGroupBracketPhaseView[];
  standings?: KeyGroupStandingView[];
};

@Injectable()
export class KeyGroupBracketViewBuilderService {
  build(details: KeyGroupDetailsView): KeyGroupBracketView {
    const bracketFormat = this.detectFormat(details);

    if (bracketFormat === KeyGroupBracketFormat.BEST_OF_THREE) {
      return {
        bracketFormat,
        phases: [
          {
            phase: 'Best of 3',
            round: 1,
            order: 1,
            fights: this.buildBestOfThreeFights(details),
          },
        ],
      };
    }

    if (bracketFormat === KeyGroupBracketFormat.OLYMPIC) {
      return {
        bracketFormat,
        phases: this.buildOlympicPhases(details.fights),
      };
    }

    return {
      bracketFormat,
      phases: [
        {
          phase: 'Round robin',
          round: 1,
          order: 1,
          fights: this.toEnabledFights(details.fights),
        },
      ],
      standings: this.buildStandings(details),
    };
  }

  private detectFormat(details: KeyGroupDetailsView): KeyGroupBracketFormat {
    const uniqueMemberIds = new Set(details.members.map((member) => member.id));
    const allFightsUseSameTwoAthletes =
      details.fights.length > 0 &&
      details.fights.every((fight) => {
        const fightAthleteIds = [fight.athleteAId, fight.athleteBId].sort(
          (left, right) => left - right,
        );
        return (
          fightAthleteIds.length === 2 &&
          fightAthleteIds[0] ===
            [...uniqueMemberIds].sort((left, right) => left - right)[0] &&
          fightAthleteIds[1] ===
            [...uniqueMemberIds].sort((left, right) => left - right)[1]
        );
      });

    if (uniqueMemberIds.size === 2 || allFightsUseSameTwoAthletes) {
      return KeyGroupBracketFormat.BEST_OF_THREE;
    }

    if (uniqueMemberIds.size === 4) {
      return KeyGroupBracketFormat.OLYMPIC;
    }

    return KeyGroupBracketFormat.ROUND_ROBIN;
  }

  private buildBestOfThreeFights(
    details: KeyGroupDetailsView,
  ): KeyGroupBracketFightView[] {
    const fights = this.toEnabledFights(
      [...details.fights].sort((left, right) => left.orderIndex - right.orderIndex),
    );

    if (fights.length >= 3) {
      return fights;
    }

    const firstFight = fights[0];
    const memberIds = details.members.map((member) => member.id);
    const athleteAId = firstFight?.athleteAId ?? memberIds[0] ?? 0;
    const athleteBId = firstFight?.athleteBId ?? memberIds[1] ?? 0;
    const athleteA = details.members.find((member) => member.id === athleteAId);
    const athleteB = details.members.find((member) => member.id === athleteBId);

    return [
      ...fights,
      {
        id: null,
        keyGroupId: details.id,
        areaId: null,
        areaName: null,
        athleteAId,
        athleteAName: athleteA?.fullName ?? null,
        athleteABirthDate: athleteA?.birthDate ?? null,
        athleteBId,
        athleteBName: athleteB?.fullName ?? null,
        athleteBBirthDate: athleteB?.birthDate ?? null,
        status: FightStatus.PENDING,
        winnerAthleteId: null,
        winType: null,
        orderIndex: 3,
        enabled: false,
      },
    ];
  }

  private buildOlympicPhases(
    fights: KeyGroupDetailsFightView[],
  ): KeyGroupBracketPhaseView[] {
    const sorted = [...fights].sort((left, right) => left.orderIndex - right.orderIndex);
    const firstRound = sorted.slice(0, Math.max(sorted.length - 1, 0));
    const finalFight = sorted.at(-1);

    return [
      {
        phase: 'Semifinals',
        round: 1,
        order: 1,
        fights: this.toEnabledFights(firstRound),
      },
      ...(finalFight
        ? [
            {
              phase: 'Final',
              round: 2,
              order: 2,
              fights: this.toEnabledFights([finalFight]),
            },
          ]
        : []),
    ];
  }

  private buildStandings(details: KeyGroupDetailsView): KeyGroupStandingView[] {
    const standings = new Map<number, KeyGroupStandingView>(
      details.members.map((member) => [
        member.id,
        {
          athleteId: member.id,
          athleteName: member.fullName,
          wins: 0,
          losses: 0,
          points: 0,
        },
      ]),
    );

    for (const fight of details.fights) {
      if (fight.status !== FightStatus.FINISHED || fight.winnerAthleteId === null) {
        continue;
      }

      const winner = standings.get(fight.winnerAthleteId);
      if (winner) {
        winner.wins += 1;
        winner.points += 3;
      }

      const loserId =
        fight.athleteAId === fight.winnerAthleteId
          ? fight.athleteBId
          : fight.athleteAId;
      const loser = standings.get(loserId);
      if (loser) {
        loser.losses += 1;
      }
    }

    return Array.from(standings.values()).sort(
      (left, right) =>
        right.points - left.points ||
        right.wins - left.wins ||
        left.losses - right.losses ||
        left.athleteName.localeCompare(right.athleteName),
    );
  }

  private toEnabledFights(
    fights: KeyGroupDetailsFightView[],
  ): KeyGroupBracketFightView[] {
    return fights.map((fight) => ({
      ...fight,
      enabled: true,
    }));
  }
}
