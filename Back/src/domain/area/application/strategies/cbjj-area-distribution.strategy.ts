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

type AreaDistribution = { areaId: number; groups: FightQueueGroup[] };

type AgedFightQueueGroup = FightQueueGroup & {
  /** Nascimento do atleta mais novo do grupo. `null` quando nao ha data conhecida. */
  youngestBirthDate: Date | null;
};

/**
 * No CBJJ a categoria e uma estrutura conectada: o perdedor da chave principal
 * cai na Serie Prata pelo `loserNextFightId`, entao o mesmo atleta aparece nos
 * dois lados. A unidade indivisivel de distribuicao e a categoria inteira
 * (Serie Ouro + Serie Prata + disputa de 3o), nunca a luta isolada.
 *
 * Diferencas em relacao as outras estrategias:
 * - agrupa por categoria e ainda funde grupos ligados por `nextFightId` /
 *   `loserNextFightId`, para que luta manual sem categoria acompanhe a chave
 *   em que foi encaixada;
 * - mantem lutas de rodadas futuras (que nascem sem atleta definido), porque
 *   `StartFightUseCase` exige area e elas so recebem atleta depois;
 * - percorre as categorias da mais nova para a mais velha e vai jogando cada
 *   uma na area menos carregada. Como as areas avancam em paralelo, toda fila
 *   comeca pelas divisoes menores e termina nas maiores, sem nunca partir uma
 *   categoria entre dois tatames.
 *
 * A idade sai das datas de nascimento dos atletas (`athleteBirthDatesById`), o
 * que dispensa uma data de referencia: comparar nascimentos ja ordena por
 * idade, e nascimento mais recente significa atleta mais novo.
 */
@Injectable()
export class CbjjAreaDistributionStrategy implements AreaDistributionStrategy {
  readonly mode = CompetitionMode.CBJJ;

  distribute(context: AreaDistributionContext): AreaDistributionResult {
    if (context.areas.length === 0) {
      throw new ValidationError(
        'At least one area is required for distribution',
      );
    }

    const orderedAreas = context.areas
      .slice()
      .sort((left, right) => left.order - right.order || left.id - right.id);
    const distributions: AreaDistribution[] = orderedAreas.map((area) => ({
      areaId: area.id,
      groups: [],
    }));
    const groups = this.buildGroups(
      context.fights,
      context.athleteBirthDatesById,
      context.anchoredAreaIdByCategoryId,
    );

    if (groups.length === 0) {
      return distributions;
    }

    const distributionsByAreaId = new Map(
      distributions.map((distribution) => [distribution.areaId, distribution]),
    );
    const loads = new Map<number, number>(
      distributions.map((distribution) => [distribution.areaId, 0]),
    );

    const sortedGroups = groups.slice().sort((left, right) => {
      return (
        this.compareByAge(left, right) ||
        left.representativeFight.orderIndex -
          right.representativeFight.orderIndex ||
        (left.representativeFight.id ?? 0) - (right.representativeFight.id ?? 0)
      );
    });

    for (const group of sortedGroups) {
      const preferred =
        group.preferredAreaId != null
          ? distributionsByAreaId.get(group.preferredAreaId)
          : undefined;
      const selected = preferred ?? this.leastLoaded(distributions, loads);

      selected.groups.push(group);
      loads.set(
        selected.areaId,
        (loads.get(selected.areaId) ?? 0) + group.fights.length,
      );
    }

    return distributions;
  }

  /**
   * Mais novo primeiro. Grupo sem nenhuma data de nascimento conhecida vai para
   * o fim, para nao se infiltrar no meio das divisoes infantis.
   */
  private compareByAge(
    left: AgedFightQueueGroup,
    right: AgedFightQueueGroup,
  ): number {
    const leftBirth = left.youngestBirthDate?.getTime() ?? null;
    const rightBirth = right.youngestBirthDate?.getTime() ?? null;

    if (leftBirth === null && rightBirth === null) {
      return 0;
    }

    if (leftBirth === null) {
      return 1;
    }

    if (rightBirth === null) {
      return -1;
    }

    return rightBirth - leftBirth;
  }

  private leastLoaded(
    distributions: AreaDistribution[],
    loads: Map<number, number>,
  ): AreaDistribution {
    return distributions
      .slice()
      .sort(
        (left, right) =>
          (loads.get(left.areaId) ?? 0) - (loads.get(right.areaId) ?? 0) ||
          left.areaId - right.areaId,
      )[0];
  }

  /**
   * Une as lutas em componentes conectados por categoria e pelos links de
   * avanco, usando union-find sobre o indice da luta na lista recebida.
   */
  private buildGroups(
    fights: FightEntity[],
    athleteBirthDatesById: Map<number, Date>,
    anchoredAreaIdByCategoryId: Map<number, number>,
  ): AgedFightQueueGroup[] {
    const parents = fights.map((_, index) => index);

    const find = (index: number): number => {
      let root = index;
      while (parents[root] !== root) {
        root = parents[root];
      }
      let cursor = index;
      while (parents[cursor] !== root) {
        const next = parents[cursor];
        parents[cursor] = root;
        cursor = next;
      }
      return root;
    };

    const union = (left: number, right: number): void => {
      const leftRoot = find(left);
      const rightRoot = find(right);

      if (leftRoot !== rightRoot) {
        parents[Math.max(leftRoot, rightRoot)] = Math.min(leftRoot, rightRoot);
      }
    };

    const indexByFightId = new Map<number, number>();
    const firstIndexByCategoryId = new Map<number, number>();

    fights.forEach((fight, index) => {
      if (fight.id !== undefined) {
        indexByFightId.set(fight.id, index);
      }
    });

    fights.forEach((fight, index) => {
      if (fight.categoryId !== null) {
        const first = firstIndexByCategoryId.get(fight.categoryId);

        if (first === undefined) {
          firstIndexByCategoryId.set(fight.categoryId, index);
        } else {
          union(first, index);
        }
      }

      for (const linkedFightId of [fight.nextFightId, fight.loserNextFightId]) {
        if (linkedFightId === null) {
          continue;
        }

        const linkedIndex = indexByFightId.get(linkedFightId);

        if (linkedIndex !== undefined) {
          union(index, linkedIndex);
        }
      }
    });

    const members = new Map<number, FightEntity[]>();

    fights.forEach((fight, index) => {
      const root = find(index);
      const current = members.get(root) ?? [];
      current.push(fight);
      members.set(root, current);
    });

    return Array.from(members.values()).map((groupFights) => {
      const sorted = groupFights
        .slice()
        .sort(
          (left, right) =>
            left.round - right.round ||
            left.orderIndex - right.orderIndex ||
            (left.id ?? 0) - (right.id ?? 0),
        );
      const representativeFight = sorted[0];
      const categoryId = sorted.find((fight) => fight.categoryId !== null)
        ?.categoryId;
      const athleteIds = Array.from(
        new Set(
          sorted
            .flatMap((fight) => [fight.athleteAId, fight.athleteBId])
            .filter((athleteId): athleteId is number => athleteId !== null),
        ),
      );

      return {
        key:
          categoryId != null
            ? `category:${categoryId}`
            : `fight:${representativeFight.id ?? representativeFight.orderIndex}`,
        fights: sorted,
        athleteIds,
        representativeFight,
        preferredAreaId: this.resolvePreferredAreaId(
          sorted,
          anchoredAreaIdByCategoryId,
        ),
        youngestBirthDate: this.resolveYoungestBirthDate(
          athleteIds,
          athleteBirthDatesById,
        ),
      };
    });
  }

  private resolveYoungestBirthDate(
    athleteIds: number[],
    athleteBirthDatesById: Map<number, Date>,
  ): Date | null {
    let youngest: Date | null = null;

    for (const athleteId of athleteIds) {
      const birthDate = athleteBirthDatesById.get(athleteId);

      if (!birthDate) {
        continue;
      }

      if (youngest === null || birthDate.getTime() > youngest.getTime()) {
        youngest = birthDate;
      }
    }

    return youngest;
  }

  /**
   * Ancora manda em tudo: se a categoria ja teve luta num tatame, o resto dela
   * volta para la, mesmo numa redistribuicao total. Sem ancora, vale a area em
   * que a maior parte da chave ja esta (caso incremental).
   */
  private resolvePreferredAreaId(
    fights: FightEntity[],
    anchoredAreaIdByCategoryId: Map<number, number>,
  ): number | null {
    for (const fight of fights) {
      const anchored =
        fight.categoryId === null
          ? undefined
          : anchoredAreaIdByCategoryId.get(fight.categoryId);

      if (anchored !== undefined) {
        return anchored;
      }
    }

    const countByAreaId = new Map<number, number>();

    for (const fight of fights) {
      if (fight.areaId === null) {
        continue;
      }
      countByAreaId.set(fight.areaId, (countByAreaId.get(fight.areaId) ?? 0) + 1);
    }

    if (countByAreaId.size === 0) {
      return null;
    }

    return Array.from(countByAreaId.entries()).sort(
      (left, right) => right[1] - left[1] || left[0] - right[0],
    )[0][0];
  }
}
