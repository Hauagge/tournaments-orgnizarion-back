import { describe, expect, it } from 'vitest';
import { FightEntity } from '@/domain/fight/domain/entities/fight.entity';
import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';
import { ValidationError } from '@/shared/errors/validation.error';
import { AreaDistributionContext } from './area-distribution.strategy';
import { CbjjAreaDistributionStrategy } from './cbjj-area-distribution.strategy';

function makeFight(input: {
  id: number;
  categoryId?: number | null;
  round?: number;
  orderIndex?: number;
  areaId?: number | null;
  athleteAId?: number | null;
  athleteBId?: number | null;
  nextFightId?: number | null;
  loserNextFightId?: number | null;
}) {
  return FightEntity.restore({
    id: input.id,
    competitionId: 1,
    categoryId: input.categoryId === undefined ? 1 : input.categoryId,
    keyGroupId: null,
    round: input.round ?? 1,
    areaId: input.areaId ?? null,
    areaName: null,
    status: FightStatus.PENDING,
    athleteAId: input.athleteAId === undefined ? 1 : input.athleteAId,
    athleteBId: input.athleteBId === undefined ? 2 : input.athleteBId,
    nextFightId: input.nextFightId ?? null,
    loserNextFightId: input.loserNextFightId ?? null,
    winType: null,
    startedAt: null,
    finishedAt: null,
    orderIndex: input.orderIndex ?? input.id,
  });
}

function makeContext(
  fights: FightEntity[],
  areas: Array<{ id: number; order: number }> = [
    { id: 1, order: 1 },
    { id: 2, order: 2 },
  ],
  athleteBirthDatesById: Map<number, Date> = new Map(),
  anchoredAreaIdByCategoryId: Map<number, number> = new Map(),
): AreaDistributionContext {
  return {
    competitionId: 1,
    areas,
    fights,
    athleteBirthDatesById,
    anchoredAreaIdByCategoryId,
  };
}

/** Atleta `id` nascido em `year` — quanto maior o ano, mais novo o atleta. */
function born(entries: Array<[number, number]>): Map<number, Date> {
  return new Map(
    entries.map(([athleteId, year]) => [athleteId, new Date(year, 0, 15)]),
  );
}

function queueOf(
  result: ReturnType<CbjjAreaDistributionStrategy['distribute']>,
  areaId: number,
): string[] {
  return (
    result
      .find((distribution) => distribution.areaId === areaId)
      ?.groups.map((group) => group.key) ?? []
  );
}

function areaOfFight(
  result: ReturnType<CbjjAreaDistributionStrategy['distribute']>,
  fightId: number,
): number | null {
  for (const distribution of result) {
    for (const group of distribution.groups) {
      if (group.fights.some((fight) => fight.id === fightId)) {
        return distribution.areaId;
      }
    }
  }

  return null;
}

describe('CbjjAreaDistributionStrategy', () => {
  const strategy = new CbjjAreaDistributionStrategy();

  it('throws when the competition has no areas', () => {
    expect(() => strategy.distribute(makeContext([], []))).toThrow(
      ValidationError,
    );
  });

  it('keeps the whole category — gold and silver series — on the same area', () => {
    // Categoria 1: chave principal (1,2 -> 3) com Serie Prata alimentada pelos
    // perdedores (4). Categoria 2 existe so para haver disputa por area.
    const fights = [
      makeFight({ id: 1, categoryId: 1, round: 1, nextFightId: 3, loserNextFightId: 4 }),
      makeFight({ id: 2, categoryId: 1, round: 1, nextFightId: 3, loserNextFightId: 4 }),
      makeFight({ id: 3, categoryId: 1, round: 2, athleteAId: null, athleteBId: null }),
      makeFight({ id: 4, categoryId: 1, round: 2, athleteAId: null, athleteBId: null }),
      makeFight({ id: 5, categoryId: 2, round: 1 }),
    ];

    const result = strategy.distribute(makeContext(fights));
    const areas = [1, 2, 3, 4].map((fightId) => areaOfFight(result, fightId));

    expect(new Set(areas).size).toBe(1);
    expect(areas[0]).not.toBeNull();
  });

  it('does not drop fights whose athletes are still undefined', () => {
    const fights = [
      makeFight({ id: 1, round: 1, nextFightId: 2 }),
      makeFight({ id: 2, round: 2, athleteAId: null, athleteBId: null }),
    ];

    const distributed = strategy
      .distribute(makeContext(fights))
      .flatMap((distribution) => distribution.groups)
      .flatMap((group) => group.fights.map((fight) => fight.id));

    expect(distributed.sort()).toEqual([1, 2]);
  });

  it('opens every area with the youngest categories and closes with the oldest', () => {
    // 4 categorias, uma por divisao etaria, criadas fora de ordem de idade.
    const fights = [
      makeFight({ id: 1, categoryId: 10, athleteAId: 101, athleteBId: 102 }),
      makeFight({ id: 2, categoryId: 20, athleteAId: 201, athleteBId: 202 }),
      makeFight({ id: 3, categoryId: 30, athleteAId: 301, athleteBId: 302 }),
      makeFight({ id: 4, categoryId: 40, athleteAId: 401, athleteBId: 402 }),
    ];
    const births = born([
      [101, 2009], [102, 2009], // categoria 10 -> mais velha
      [201, 2017], [202, 2017], // categoria 20 -> mais nova
      [301, 2013], [302, 2013],
      [401, 2015], [402, 2015],
    ]);

    const result = strategy.distribute(makeContext(fights, undefined, births));

    // Ordem global por idade: 20 (2017), 40 (2015), 30 (2013), 10 (2009).
    // Alternando pela area menos carregada: area 1 fica com 20 e 30; area 2 com 40 e 10.
    expect(queueOf(result, 1)).toEqual(['category:20', 'category:30']);
    expect(queueOf(result, 2)).toEqual(['category:40', 'category:10']);
  });

  it('balances the areas while following the age order', () => {
    const fights = [
      ...[1, 2, 3].map((id) => makeFight({ id, categoryId: 10, athleteAId: 100 + id, athleteBId: 150 + id })),
      ...[4, 5].map((id) => makeFight({ id, categoryId: 20, athleteAId: 200 + id, athleteBId: 250 + id })),
      ...[6, 7, 8].map((id) => makeFight({ id, categoryId: 30, athleteAId: 300 + id, athleteBId: 350 + id })),
    ];
    const births = born([
      [101, 2016], [151, 2016], [102, 2016], [152, 2016], [103, 2016], [153, 2016],
      [204, 2014], [254, 2014], [205, 2014], [255, 2014],
      [306, 2012], [356, 2012], [307, 2012], [357, 2012], [308, 2012], [358, 2012],
    ]);

    const result = strategy.distribute(makeContext(fights, undefined, births));
    const counts = result.map((distribution) =>
      distribution.groups.reduce((total, group) => total + group.fights.length, 0),
    );

    // 10 (mais nova) abre a area 1; 20 vai para a area vazia; 30 volta para a menos carregada.
    expect(queueOf(result, 1)).toEqual(['category:10']);
    expect(queueOf(result, 2)).toEqual(['category:20', 'category:30']);
    expect(counts).toEqual([3, 5]);
  });

  it('pushes categories without known birth dates to the end of the queue', () => {
    const fights = [
      makeFight({ id: 1, categoryId: 10, athleteAId: 101, athleteBId: 102 }),
      makeFight({ id: 2, categoryId: 20, athleteAId: null, athleteBId: null }),
    ];
    const births = born([[101, 2010], [102, 2010]]);

    const result = strategy.distribute(
      makeContext(fights, [{ id: 1, order: 1 }], births),
    );

    expect(queueOf(result, 1)).toEqual(['category:10', 'category:20']);
  });

  it('pulls a manual fight without category into the bracket it feeds, even against the load balance', () => {
    // Sem a fusao por link, a luta 6 (sem categoria) seria um grupo solto e o
    // balanceamento a mandaria para a area menos carregada (a 2), separando-a
    // da chave que ela alimenta.
    const fights = [
      ...[1, 2, 3].map((id) => makeFight({ id, categoryId: 10 })),
      ...[4, 5].map((id) => makeFight({ id, categoryId: 20 })),
      makeFight({ id: 6, categoryId: null, nextFightId: 1 }),
    ];

    const result = strategy.distribute(makeContext(fights));

    expect(areaOfFight(result, 1)).toBe(1);
    expect(areaOfFight(result, 4)).toBe(2);
    expect(areaOfFight(result, 6)).toBe(1);
  });

  it('keeps a split category on the area where most of it already is', () => {
    // Chave que sobrou espalhada por edicao manual: a maioria esta na area 2,
    // entao a categoria inteira volta para a area 2 — e nao para a area menos
    // carregada, que seria a 1.
    const fights = [
      makeFight({ id: 1, categoryId: 10, areaId: 2 }),
      makeFight({ id: 2, categoryId: 10, areaId: 2 }),
      makeFight({ id: 3, categoryId: 10, areaId: 2 }),
      makeFight({ id: 4, categoryId: 10, areaId: 1 }),
    ];

    const result = strategy.distribute(makeContext(fights));

    expect(areaOfFight(result, 1)).toBe(2);
    expect(areaOfFight(result, 4)).toBe(2);
  });

  it('sends the rest of a category back to the area where it already happened', () => {
    // Redistribuicao total: as lutas pendentes chegam sem area (o planner limpa),
    // mas a categoria 10 ja teve luta encerrada no tatame 2. Sem a ancora, o
    // balanceamento mandaria a chave para o tatame 1 e partiria a categoria.
    const fights = [
      makeFight({ id: 1, categoryId: 10, athleteAId: 101, athleteBId: 102 }),
      makeFight({ id: 2, categoryId: 10, athleteAId: 103, athleteBId: 104 }),
    ];
    const births = born([[101, 2016], [102, 2016], [103, 2016], [104, 2016]]);

    const result = strategy.distribute(
      makeContext(fights, undefined, births, new Map([[10, 2]])),
    );

    expect(areaOfFight(result, 1)).toBe(2);
    expect(areaOfFight(result, 2)).toBe(2);
  });

  it('ignores a preferred area that no longer exists', () => {
    const fights = [makeFight({ id: 1, categoryId: 20, areaId: 99 })];

    const result = strategy.distribute(makeContext(fights));

    expect(areaOfFight(result, 1)).toBe(1);
  });

  it('exposes every athlete of the category so the rest policy can space them out', () => {
    const fights = [
      makeFight({ id: 1, athleteAId: 11, athleteBId: 12, loserNextFightId: 2 }),
      makeFight({ id: 2, round: 2, athleteAId: 13, athleteBId: null }),
    ];

    const [group] = strategy
      .distribute(makeContext(fights))
      .flatMap((distribution) => distribution.groups);

    expect(group.athleteIds.sort()).toEqual([11, 12, 13]);
  });
});
