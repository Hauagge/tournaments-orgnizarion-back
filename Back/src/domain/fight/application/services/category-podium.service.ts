import { Injectable } from '@nestjs/common';
import { FightEntity } from '../../domain/entities/fight.entity';
import { FightStatus } from '../../domain/value-objects/fight-status.enum';

export type Podium = {
  firstAthleteId: number | null;
  secondAthleteId: number | null;
  /**
   * Regulamento, item 9: chaves de ate 5 atletas tem um terceiro (vencedor da
   * disputa de 3o); de 6 em diante sao **dois** terceiros, os perdedores das
   * semifinais. Vazio no melhor de tres.
   */
  thirdAthleteIds: number[];
  /** Falso enquanto houver luta em aberto: o podio ainda pode mudar. */
  decided: boolean;
};

export type CategoryPodiums = {
  /** Chave principal: e este podio que define o campeao da categoria. */
  main: Podium;
  /**
   * Serie secundaria (a Prata do formato Ouro/Prata). Tem podio proprio e
   * **nao** conta para o ranking de academias. Null nos demais formatos.
   */
  secondary: Podium | null;
};

const EMPTY_PODIUM: Podium = {
  firstAthleteId: null,
  secondAthleteId: null,
  thirdAthleteIds: [],
  decided: false,
};

/**
 * Deriva o podio de uma categoria (ou chave) a partir das suas lutas. Nao ha
 * coluna de segundo e terceiro no banco: tudo sai do encadeamento de avancos,
 * que ja distingue quem sobe como vencedor de quem cai como perdedor.
 *
 * No formato Ouro/Prata as duas series sao chaves completas, cada uma com final
 * e disputa de terceiro. O podio da categoria e sempre o da Serie Ouro — a
 * Prata tem podio proprio, que nao entra nesta conta.
 */
@Injectable()
export class CategoryPodiumService {
  resolve(fights: FightEntity[]): Podium {
    return this.resolveAll(fights).main;
  }

  resolveAll(fights: FightEntity[]): CategoryPodiums {
    const activeFights = fights.filter(
      (fight) => fight.status !== FightStatus.CANCELED,
    );

    if (activeFights.length === 0) {
      return { main: EMPTY_PODIUM, secondary: null };
    }

    const decided = activeFights.every(
      (fight) => fight.status === FightStatus.FINISHED,
    );
    const lastRound = Math.max(...activeFights.map((fight) => fight.round));

    if (lastRound === 1) {
      return {
        main: { ...this.resolveByWins(activeFights), decided },
        secondary: null,
      };
    }

    const titleFight = this.resolveTitleFight(activeFights, lastRound);

    if (!titleFight) {
      return { main: { ...EMPTY_PODIUM, decided }, secondary: null };
    }

    const mainBronzeId = this.findBronzeId(activeFights, titleFight);

    return {
      main: {
        firstAthleteId: titleFight.winnerId,
        secondAthleteId: titleFight.loserId,
        thirdAthleteIds: this.podiumThirds(
          activeFights,
          titleFight,
          mainBronzeId,
        ),
        decided,
      },
      secondary: this.resolveSecondary(
        activeFights,
        titleFight,
        mainBronzeId,
        decided,
      ),
    };
  }

  /**
   * A Serie Prata nasce dos perdedores da primeira rodada e nunca reencontra a
   * chave principal. Dois vizinhos se parecem com ela e precisam ficar de fora:
   * a disputa de terceiro (tambem alimentada por perdedor, mas ja usada como 3o
   * lugar) e a repescagem do playoff de 3 atletas (cujo vencedor volta para a
   * final).
   */
  private resolveSecondary(
    fights: FightEntity[],
    titleFight: FightEntity,
    mainBronzeId: number | undefined,
    decided: boolean,
  ): Podium | null {
    const fightsById = new Map(
      fights.map((fight) => [fight.id as number, fight]),
    );

    const entries = fights
      .filter((fight) => fight.round === 1)
      .map((fight) => fight.loserNextFightId)
      .filter(
        (fightId): fightId is number =>
          fightId !== null && fightId !== mainBronzeId,
      )
      .map((fightId) => fightsById.get(fightId))
      .filter((fight): fight is FightEntity => fight !== undefined)
      .filter((fight) => !this.reachesFight(fight, titleFight.id, fightsById));

    if (entries.length === 0) {
      return null;
    }

    const secondaryFinal = entries
      .map((entry) => this.walkWinnerChain(entry, fightsById))
      .sort((left, right) => right.round - left.round)[0];

    if (!secondaryFinal || secondaryFinal.id === titleFight.id) {
      return null;
    }

    return {
      firstAthleteId: secondaryFinal.winnerId,
      secondAthleteId: secondaryFinal.loserId,
      thirdAthleteIds: this.podiumThirds(
        fights,
        secondaryFinal,
        this.findBronzeId(fights, secondaryFinal),
      ),
      decided,
    };
  }

  private walkWinnerChain(
    start: FightEntity,
    fightsById: Map<number, FightEntity>,
  ): FightEntity {
    let current = start;
    const visited = new Set<number>([current.id as number]);

    while (current.nextFightId !== null) {
      const next = fightsById.get(current.nextFightId);

      if (!next || visited.has(next.id as number)) {
        break;
      }

      visited.add(next.id as number);
      current = next;
    }

    return current;
  }

  private reachesFight(
    start: FightEntity,
    targetId: number | undefined,
    fightsById: Map<number, FightEntity>,
  ): boolean {
    return this.walkWinnerChain(start, fightsById).id === targetId;
  }

  /**
   * A luta que vale titulo e o fim da cadeia de vencedores que comeca na
   * primeira rodada (`nextFightId` sempre carrega o vencedor). Disputa de
   * terceiro e Serie Prata sao alimentadas por `loserNextFightId`, entao nunca
   * aparecem nessa cadeia — mesmo estando na mesma rodada da final e mesmo que
   * a ordem de chamada das lutas seja alterada na aba de Lutas.
   */
  resolveTitleFight(
    fights: FightEntity[],
    lastRound: number,
  ): FightEntity | null {
    const fightsById = new Map(
      fights.map((fight) => [fight.id as number, fight]),
    );
    let candidate: FightEntity | null = null;

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

      if (candidate === null || current.round > candidate.round) {
        candidate = current;
      }
    }

    // Sem os links gravados (dados antigos, chaves montadas a mao) a cadeia nao
    // chega ate a ultima rodada: ai vale a ordem de criacao.
    if (candidate !== null && candidate.round === lastRound) {
      return candidate;
    }

    return (
      fights
        .filter((fight) => fight.round === lastRound)
        .sort((left, right) => left.order - right.order)[0] ?? null
    );
  }

  /**
   * O terceiro sai da disputa de terceiro da mesma serie da final: as duas
   * semifinais que alimentam a final mandam o perdedor para ela. No playoff de
   * 3 atletas nao existe essa luta — o terceiro e quem perdeu a repescagem.
   */
  /**
   * Uma luta so e disputa de terceiro se recebe o perdedor das **duas**
   * semifinais. Exigir isso e o que impede confundi-la com a final da Serie
   * Prata: no formato Ouro/Prata a luta de abertura tambem alimenta a final do
   * Ouro (pelo vencedor) e manda o perdedor para a Prata, mas sozinha — a outra
   * semifinal nao aponta para la.
   */
  private findBronzeId(
    fights: FightEntity[],
    finalFight: FightEntity,
  ): number | undefined {
    const semifinals = fights.filter(
      (fight) => fight.nextFightId === finalFight.id,
    );
    const semifinalIds = new Set(semifinals.map((fight) => fight.id as number));
    const feedCount = new Map<number, number>();

    for (const semifinal of semifinals) {
      const target = semifinal.loserNextFightId;

      if (target === null || semifinalIds.has(target)) {
        continue;
      }

      feedCount.set(target, (feedCount.get(target) ?? 0) + 1);
    }

    for (const [fightId, count] of feedCount) {
      if (count >= 2) {
        return fightId;
      }
    }

    return undefined;
  }

  /**
   * Com disputa de terceiro (ate 5 atletas) ha um unico terceiro: o vencedor
   * dela. Sem disputa, sao terceiros os perdedores das semifinais — descartando
   * quem seguiu para a final, que e o caso do perdedor do primeiro combate no
   * playoff de 3 atletas quando ele vence a repescagem.
   */
  private podiumThirds(
    fights: FightEntity[],
    finalFight: FightEntity,
    bronzeId: number | undefined,
  ): number[] {
    if (bronzeId !== undefined) {
      const bronzeWinner = fights.find(
        (fight) => fight.id === bronzeId,
      )?.winnerId;

      return bronzeWinner !== null && bronzeWinner !== undefined
        ? [bronzeWinner]
        : [];
    }

    const finalists = new Set(
      [finalFight.athleteAId, finalFight.athleteBId].filter(
        (athleteId): athleteId is number => athleteId !== null,
      ),
    );

    const thirds = fights
      .filter((fight) => fight.nextFightId === finalFight.id)
      // Quem perde e roteado para outro lugar nao foi eliminado aqui: e o caso
      // da luta de abertura no formato Ouro/Prata, cujo vencedor pode chegar a
      // final do Ouro enquanto o perdedor desce para a Prata. Sem este filtro o
      // mesmo atleta apareceria como terceiro do Ouro e campeao da Prata.
      .filter((fight) => fight.loserNextFightId === null)
      .map((fight) => fight.loserId)
      .filter(
        (athleteId): athleteId is number =>
          athleteId !== null && !finalists.has(athleteId),
      );

    return Array.from(new Set(thirds));
  }

  /** Melhor de tres: decide por numero de vitorias, sem terceiro colocado. */
  private resolveByWins(fights: FightEntity[]): Omit<Podium, 'decided'> {
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
      return {
        firstAthleteId: null,
        secondAthleteId: null,
        thirdAthleteIds: [],
      };
    }

    const [[championId, championWins]] = ranked;
    const isTied =
      ranked.filter(([, wins]) => wins === championWins).length > 1;

    if (isTied) {
      return {
        firstAthleteId: null,
        secondAthleteId: null,
        thirdAthleteIds: [],
      };
    }

    return {
      firstAthleteId: championId,
      secondAthleteId: ranked[1]?.[0] ?? null,
      thirdAthleteIds: ranked[2] ? [ranked[2][0]] : [],
    };
  }
}
