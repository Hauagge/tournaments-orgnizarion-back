import { Injectable } from '@nestjs/common';
import { Athlete } from '@/domain/athlete/domain/entities/athlete.entity';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { FightEntity } from '../../domain/entities/fight.entity';
import {
  FightGenerationLink,
  FightGenerationMetadata,
  FightGenerationResult,
  FightGenerationStrategy,
} from './fight-generation.strategy';

export type CbjjFightGenerationInput = {
  competitionId: number;
  categoryId: number;
  athletes: Athlete[];
};

/** Quem entra numa luta: um atleta, ou o vencedor/perdedor de outra luta. */
type Entrant =
  | { kind: 'ATHLETE'; athleteId: number }
  | { kind: 'FIGHT'; fightIndex: number; role: 'WINNER' | 'LOSER' };

type Builder = {
  competitionId: number;
  categoryId: number;
  fights: FightEntity[];
  links: FightGenerationLink[];
  nextOrder: number;
};

/**
 * Formato oficial por quantidade de atletas na categoria:
 * 2 melhor de 3 | 3 playoff | 4 semis + final + 3o | 5-7 eliminatoria + 3o |
 * 8+ Serie Ouro (vencedores da 1a rodada) e Serie Prata (perdedores).
 * Quem fica sem adversario na rodada avanca automaticamente.
 */
@Injectable()
export class CbjjFightGenerationStrategy
  implements FightGenerationStrategy<CbjjFightGenerationInput>
{
  readonly mode = CompetitionMode.CBJJ;

  generate(input: CbjjFightGenerationInput): FightGenerationResult {
    const athleteIds = Array.from(
      new Set(
        input.athletes
          .map((athlete) => athlete.id)
          .filter((id): id is number => id !== undefined),
      ),
    );

    if (athleteIds.length < 2) {
      return { fights: [], metadata: [] };
    }

    const builder: Builder = {
      competitionId: input.competitionId,
      categoryId: input.categoryId,
      fights: [],
      links: [],
      nextOrder: 1,
    };

    const format = this.buildFormat(builder, athleteIds);

    return {
      fights: builder.fights,
      links: builder.links,
      metadata: [
        {
          categoryId: input.categoryId,
          format: format.format,
          notes: format.notes,
        },
      ],
    };
  }

  private buildFormat(
    builder: Builder,
    athleteIds: number[],
  ): { format: FightGenerationMetadata['format']; notes: string[] } {
    if (athleteIds.length === 2) {
      return this.buildBestOfThree(builder, athleteIds);
    }

    if (athleteIds.length === 3) {
      return this.buildThreeAthletePlayoff(builder, athleteIds);
    }

    if (athleteIds.length <= 7) {
      return this.buildBracketWithBronze(builder, athleteIds);
    }

    return this.buildGoldSilverSeries(builder, athleteIds);
  }

  /** 2 atletas: duas lutas; a terceira so nasce se ficar 1x1. */
  private buildBestOfThree(builder: Builder, athleteIds: number[]) {
    const [athleteAId, athleteBId] = athleteIds;

    this.addFight(builder, {
      round: 1,
      entrantA: { kind: 'ATHLETE', athleteId: athleteAId },
      entrantB: { kind: 'ATHLETE', athleteId: athleteBId },
    });
    this.addFight(builder, {
      round: 1,
      entrantA: { kind: 'ATHLETE', athleteId: athleteAId },
      entrantB: { kind: 'ATHLETE', athleteId: athleteBId },
    });

    return {
      format: 'BEST_OF_THREE' as const,
      notes: ['Terceira luta criada apenas se as duas primeiras ficarem 1x1'],
    };
  }

  /**
   * 3 atletas: dois lutam, o perdedor enfrenta o terceiro e o vencedor dessa
   * disputa a final com o vencedor da primeira.
   */
  private buildThreeAthletePlayoff(builder: Builder, athleteIds: number[]) {
    const [first, second, third] = athleteIds;

    const openingIndex = this.addFight(builder, {
      round: 1,
      entrantA: { kind: 'ATHLETE', athleteId: first },
      entrantB: { kind: 'ATHLETE', athleteId: second },
    });
    const repechageIndex = this.addFight(builder, {
      round: 2,
      entrantA: { kind: 'FIGHT', fightIndex: openingIndex, role: 'LOSER' },
      entrantB: { kind: 'ATHLETE', athleteId: third },
    });
    this.addFight(builder, {
      round: 3,
      entrantA: { kind: 'FIGHT', fightIndex: openingIndex, role: 'WINNER' },
      entrantB: { kind: 'FIGHT', fightIndex: repechageIndex, role: 'WINNER' },
    });

    return {
      format: 'THREE_ATHLETE_PLAYOFF' as const,
      notes: [
        'Luta 1: atletas 1 e 2',
        'Luta 2: perdedor da luta 1 contra o atleta 3',
        'Final: vencedor da luta 1 contra o vencedor da luta 2',
      ],
    };
  }

  /** 4 a 7 atletas: eliminatoria simples com disputa de terceiro. */
  private buildBracketWithBronze(builder: Builder, athleteIds: number[]) {
    const entrants: Entrant[] = athleteIds.map((athleteId) => ({
      kind: 'ATHLETE',
      athleteId,
    }));
    const bracket = this.buildBracket(builder, entrants, 1);

    if (bracket.semifinalIndexes.length === 2) {
      this.addFight(builder, {
        round: bracket.lastRound,
        entrantA: {
          kind: 'FIGHT',
          fightIndex: bracket.semifinalIndexes[0],
          role: 'LOSER',
        },
        entrantB: {
          kind: 'FIGHT',
          fightIndex: bracket.semifinalIndexes[1],
          role: 'LOSER',
        },
      });
    }

    return {
      format: 'OLYMPIC_WITH_BRONZE' as const,
      notes: [
        'Eliminatoria simples; quem fica sem adversario avanca automaticamente',
        'Perdedores das semifinais disputam o terceiro lugar',
      ],
    };
  }

  /**
   * 8 ou mais: a primeira rodada emparelha o maximo de atletas; vencedores vao
   * para a Serie Ouro e perdedores para a Serie Prata. Sobrando um atleta, ele
   * avanca direto para a Ouro.
   */
  private buildGoldSilverSeries(builder: Builder, athleteIds: number[]) {
    const openingPairs = Math.floor(athleteIds.length / 2);
    const goldEntrants: Entrant[] = [];
    const silverEntrants: Entrant[] = [];

    for (let index = 0; index < openingPairs; index += 1) {
      const fightIndex = this.addFight(builder, {
        round: 1,
        entrantA: { kind: 'ATHLETE', athleteId: athleteIds[index * 2] },
        entrantB: { kind: 'ATHLETE', athleteId: athleteIds[index * 2 + 1] },
      });

      goldEntrants.push({ kind: 'FIGHT', fightIndex, role: 'WINNER' });
      silverEntrants.push({ kind: 'FIGHT', fightIndex, role: 'LOSER' });
    }

    if (athleteIds.length % 2 === 1) {
      goldEntrants.push({
        kind: 'ATHLETE',
        athleteId: athleteIds[athleteIds.length - 1],
      });
    }

    const gold = this.buildBracket(builder, goldEntrants, 2);
    this.buildBracket(builder, silverEntrants, 2);

    return {
      format: 'GOLD_SILVER_SERIES' as const,
      notes: [
        `Primeira rodada com ${openingPairs} luta(s)`,
        'Vencedores seguem para a Serie Ouro e perdedores para a Serie Prata',
        athleteIds.length % 2 === 1
          ? 'Atleta sem adversario na primeira rodada avanca direto para a Serie Ouro'
          : 'Series com o mesmo numero de atletas',
        `Serie Ouro decidida na rodada ${gold.lastRound}`,
      ],
    };
  }

  /**
   * Monta uma chave eliminatoria sobre os participantes informados. Quem fica
   * sem par na rodada passa direto, sem gerar luta.
   */
  private buildBracket(
    builder: Builder,
    entrants: Entrant[],
    startRound: number,
  ): { finalIndex: number | null; semifinalIndexes: number[]; lastRound: number } {
    let current = [...entrants];
    let round = startRound;
    let previousRoundIndexes: number[] = [];
    let lastRoundIndexes: number[] = [];

    while (current.length > 1) {
      const next: Entrant[] = [];
      const roundIndexes: number[] = [];
      const byes = this.byeCount(current.length);
      let cursor = 0;

      for (let index = 0; index < byes; index += 1) {
        next.push(current[cursor]);
        cursor += 1;
      }

      while (cursor < current.length) {
        const entrantA = current[cursor];
        const entrantB = current[cursor + 1];
        cursor += 2;

        if (!entrantB) {
          next.push(entrantA);
          continue;
        }

        const fightIndex = this.addFight(builder, {
          round,
          entrantA,
          entrantB,
        });
        roundIndexes.push(fightIndex);
        next.push({ kind: 'FIGHT', fightIndex, role: 'WINNER' });
      }

      if (roundIndexes.length > 0) {
        previousRoundIndexes = lastRoundIndexes;
        lastRoundIndexes = roundIndexes;
      }

      current = next;
      round += 1;
    }

    return {
      finalIndex: lastRoundIndexes[lastRoundIndexes.length - 1] ?? null,
      semifinalIndexes: previousRoundIndexes,
      lastRound: round - 1,
    };
  }

  private byeCount(entrants: number): number {
    const bracketSize = 2 ** Math.ceil(Math.log2(entrants));
    return bracketSize - entrants;
  }

  private addFight(
    builder: Builder,
    input: { round: number; entrantA: Entrant; entrantB: Entrant },
  ): number {
    const fightIndex = builder.fights.length;

    builder.fights.push(
      FightEntity.create({
        competitionId: builder.competitionId,
        categoryId: builder.categoryId,
        keyGroupId: null,
        round: input.round,
        order: builder.nextOrder++,
        areaId: null,
        areaName: null,
        athleteAId:
          input.entrantA.kind === 'ATHLETE' ? input.entrantA.athleteId : null,
        athleteBId:
          input.entrantB.kind === 'ATHLETE' ? input.entrantB.athleteId : null,
      }),
    );

    this.registerLink(builder, input.entrantA, fightIndex, 'A');
    this.registerLink(builder, input.entrantB, fightIndex, 'B');

    return fightIndex;
  }

  private registerLink(
    builder: Builder,
    entrant: Entrant,
    toIndex: number,
    slot: 'A' | 'B',
  ): void {
    if (entrant.kind !== 'FIGHT') {
      return;
    }

    const existing = builder.links.find(
      (link) => link.fromIndex === entrant.fightIndex,
    );
    const link: FightGenerationLink = existing ?? {
      fromIndex: entrant.fightIndex,
    };

    if (entrant.role === 'WINNER') {
      link.winner = { toIndex, slot };
    } else {
      link.loser = { toIndex, slot };
    }

    if (!existing) {
      builder.links.push(link);
    }
  }
}
