import { describe, expect, it } from 'vitest';
import { makeAthlete } from '../../../../../test/factories/athlete.factory';
import { CbjjFightGenerationStrategy } from './cbjj-fight-generation.strategy';

function athletes(total: number) {
  return Array.from({ length: total }, (_, index) =>
    makeAthlete({ id: index + 1 }),
  );
}

function generate(total: number) {
  return new CbjjFightGenerationStrategy().generate({
    competitionId: 1,
    categoryId: 7,
    athletes: athletes(total),
  });
}

describe('CbjjFightGenerationStrategy', () => {
  it('generates two fights for a best of three', () => {
    const result = generate(2);

    expect(result.fights).toHaveLength(2);
    expect(result.metadata[0].format).toBe('BEST_OF_THREE');
    expect(result.links).toEqual([]);
  });

  it('sends the first loser against the third athlete', () => {
    const result = generate(3);

    expect(result.fights).toHaveLength(3);
    expect(result.metadata[0].format).toBe('THREE_ATHLETE_PLAYOFF');
    // luta 1: atletas 1 x 2 | luta 2: perdedor da 1 x atleta 3 | luta 3: final
    expect(result.fights[1].athleteBId).toBe(3);
    expect(result.links).toEqual([
      {
        fromIndex: 0,
        loser: { toIndex: 1, slot: 'A' },
        winner: { toIndex: 2, slot: 'A' },
      },
      { fromIndex: 1, winner: { toIndex: 2, slot: 'B' } },
    ]);
  });

  it('gives both semifinal losers a medal on a four-athlete bracket', () => {
    // Sem disputa de terceiro: os 4 atletas sobem ao podio (1o, 2o e dois 3os).
    const result = generate(4);

    expect(result.metadata[0].format).toBe('OLYMPIC');
    expect(result.fights).toHaveLength(3);
    expect(result.fights.filter((fight) => fight.round === 1)).toHaveLength(2);
    expect((result.links ?? []).some((link) => link.loser)).toBe(false);
  });

  it('lets athletes without an opponent advance instead of creating a bye fight', () => {
    // 5 atletas no Ouro/Prata: 2 lutas de abertura e o 5o entra direto na Ouro,
    // que fica com 3 atletas e resolve com um bye em vez de luta vazia.
    const result = generate(5);

    expect(result.metadata[0].format).toBe('GOLD_SILVER_SERIES');
    expect(result.fights).toHaveLength(5);
    expect(result.fights.filter((fight) => fight.round === 1)).toHaveLength(2);
    expect(
      result.fights.every(
        (fight) => fight.round === 1 || fight.athleteAId === null || fight.athleteBId === null,
      ),
    ).toBe(true);
  });

  it('switches to gold/silver series from five athletes on', () => {
    // Chave de 4: uma eliminatoria simples ja medalha os quatro (1o, 2o e dois
    // 3os). De 5 em diante so o Ouro/Prata consegue medalhar todos.
    const formato = (total: number) => generate(total).metadata[0].format;

    expect(formato(4)).toBe('OLYMPIC');
    expect(formato(5)).toBe('GOLD_SILVER_SERIES');
    expect(formato(6)).toBe('GOLD_SILVER_SERIES');
    expect(formato(7)).toBe('GOLD_SILVER_SERIES');

    expect(generate(4).fights).toHaveLength(3);
    expect(generate(5).fights).toHaveLength(5);
    expect(generate(6).fights).toHaveLength(7);
    expect(generate(7).fights).toHaveLength(8);

    // Ate 5 atletas a ultima rodada tem final + disputa de terceiro. De 6 em
    // diante tem as duas finais (Ouro e Prata), sem disputa de terceiro.
    const ultimaRodada = (total: number) => {
      const fights = generate(total).fights;
      const last = Math.max(...fights.map((fight) => fight.round));
      return fights.filter((fight) => fight.round === last).length;
    };

    expect(ultimaRodada(4)).toBe(1); // so a final
    // n=5: a Prata tem so 2 atletas, entao a final dela cai uma rodada antes da
    // final da Ouro — a ultima rodada fica so com a final da Ouro.
    expect(ultimaRodada(5)).toBe(1);
    expect(ultimaRodada(6)).toBe(2); // as duas finais na mesma rodada
    expect(ultimaRodada(7)).toBe(2);
  });

  it('splits eight athletes into gold and silver series, each with two thirds', () => {
    const result = generate(8);

    expect(result.metadata[0].format).toBe('GOLD_SILVER_SERIES');
    // 4 de abertura + (2 semis + final) por serie. Sem disputa de terceiro:
    // cada serie premia os dois perdedores de semifinal.
    expect(result.fights).toHaveLength(10);
    expect(result.fights.filter((fight) => fight.round === 1)).toHaveLength(4);

    const openingLinks = (result.links ?? []).filter(
      (link) => link.fromIndex < 4,
    );
    expect(openingLinks).toHaveLength(4);
    expect(openingLinks.every((link) => link.winner && link.loser)).toBe(true);

    // As duas finais caem na mesma rodada e nada mais: nenhuma luta de bronze.
    const lastRound = Math.max(...result.fights.map((fight) => fight.round));
    expect(
      result.fights.filter((fight) => fight.round === lastRound),
    ).toHaveLength(2);

    // Links de perdedor existem somente na abertura (Ouro -> Prata).
    const loserLinksAfterOpening = (result.links ?? []).filter(
      (link) => link.loser && link.fromIndex >= 4,
    );
    expect(loserLinksAfterOpening).toHaveLength(0);
  });

  it('sends the leftover athlete of an odd draw straight to the gold series', () => {
    const result = generate(9);

    expect(result.fights.filter((fight) => fight.round === 1)).toHaveLength(4);
    // o nono atleta entra direto numa luta da serie ouro
    const goldEntryFights = result.fights.filter(
      (fight) => fight.round > 1 && fight.athleteBId === 9,
    );
    expect(goldEntryFights).toHaveLength(1);
  });

  it('returns nothing for a category with a single athlete', () => {
    expect(generate(1).fights).toHaveLength(0);
  });

  it.each(Array.from({ length: 23 }, (_, index) => index + 2))(
    'builds a consistent bracket for %i athletes',
    (total) => {
      const { fights: plan, links = [] } = generate(total);

      const incomingBySlot = new Map<string, number>();
      for (const link of links) {
        for (const destination of [link.winner, link.loser]) {
          if (!destination) {
            continue;
          }
          const slotKey = `${destination.toIndex}:${destination.slot}`;
          incomingBySlot.set(slotKey, (incomingBySlot.get(slotKey) ?? 0) + 1);
        }
      }

      plan.forEach((fight, index) => {
        if (fight.round === 1) {
          expect(fight.athleteAId).not.toBeNull();
          expect(fight.athleteBId).not.toBeNull();
        }

        for (const slot of ['A', 'B'] as const) {
          const seeded = slot === 'A' ? fight.athleteAId : fight.athleteBId;
          const incoming = incomingBySlot.get(`${index}:${slot}`) ?? 0;
          expect((seeded !== null ? 1 : 0) + incoming).toBe(1);
        }
      });

      for (const link of links) {
        for (const destination of [link.winner, link.loser]) {
          if (!destination) {
            continue;
          }
          expect(plan[destination.toIndex].round).toBeGreaterThan(
            plan[link.fromIndex].round,
          );
          expect(plan[destination.toIndex].order).toBeGreaterThan(
            plan[link.fromIndex].order,
          );
        }
      }
    },
  );
});
