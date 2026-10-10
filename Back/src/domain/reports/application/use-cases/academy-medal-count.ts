import {
  CategoryResultView,
  ResultAthleteView,
} from './competition-results.view';

type MedalFilters = {
  belt?: string;
  ageDivision?: string;
  categoryId?: number;
};

/** Mesma chave do agrupamento de campeoes: id da academia, ou 'none'. */
function academyKey(athlete: ResultAthleteView): string {
  return athlete.academyId === null ? 'none' : String(athlete.academyId);
}

function matchesFilters(
  podium: CategoryResultView,
  filters: MedalFilters,
): boolean {
  if (
    filters.categoryId !== undefined &&
    podium.categoryId !== filters.categoryId
  ) {
    return false;
  }

  if (
    filters.belt !== undefined &&
    (podium.belt ?? '').trim().toLocaleLowerCase() !==
      filters.belt.trim().toLocaleLowerCase()
  ) {
    return false;
  }

  if (
    filters.ageDivision !== undefined &&
    (podium.ageDivision ?? '').toLocaleLowerCase() !==
      filters.ageDivision.trim().toLocaleLowerCase()
  ) {
    return false;
  }

  return true;
}

/**
 * Pratas e bronzes por academia, tirados do mesmo podio da tela de
 * Resultados. So conta categoria decidida; a Serie Prata fica de fora.
 */
export function countSilversAndBronzes(
  podiums: CategoryResultView[],
  filters: MedalFilters,
): { silvers: Map<string, number>; bronzes: Map<string, number> } {
  const silvers = new Map<string, number>();
  const bronzes = new Map<string, number>();
  const add = (totals: Map<string, number>, athlete: ResultAthleteView) => {
    const key = academyKey(athlete);
    totals.set(key, (totals.get(key) ?? 0) + 1);
  };

  for (const podium of podiums) {
    if (!podium.decided || !matchesFilters(podium, filters)) {
      continue;
    }

    if (podium.second) {
      add(silvers, podium.second);
    }
    podium.thirds.forEach((athlete) => add(bronzes, athlete));
  }

  return { silvers, bronzes };
}
