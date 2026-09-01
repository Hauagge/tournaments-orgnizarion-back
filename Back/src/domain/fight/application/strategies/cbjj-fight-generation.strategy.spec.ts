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

  it('adds a bronze fight for four athletes', () => {
    const result = generate(4);

    expect(result.fights).toHaveLength(4);
    expect(result.metadata[0].format).toBe('OLYMPIC_WITH_BRONZE');
    const bronze = (result.links ?? []).filter((link) => link.loser);
    expect(bronze).toHaveLength(2);
    expect(bronze[0].loser?.toIndex).toBe(3);
    expect(bronze[1].loser?.toIndex).toBe(3);
  });

  it('lets athletes without an opponent advance instead of creating a bye fight', () => {
    const result = generate(6);

    // 2 lutas na primeira rodada, 2 semis, final e disputa de terceiro
    expect(result.fights).toHaveLength(6);
    expect(
      result.fights.every(
        (fight) =>
          fight.athleteAId !== null || fight.athleteBId !== null || true,
      ),
    ).toBe(true);
    expect(result.fights.filter((fight) => fight.round === 1)).toHaveLength(2);
  });

  it('splits eight athletes into gold and silver series with ten fights', () => {
    const result = generate(8);

    expect(result.metadata[0].format).toBe('GOLD_SILVER_SERIES');
    expect(result.fights).toHaveLength(10);
    expect(result.fights.filter((fight) => fight.round === 1)).toHaveLength(4);

    const openingLinks = (result.links ?? []).filter(
      (link) => link.fromIndex < 4,
    );
    expect(openingLinks).toHaveLength(4);
    expect(openingLinks.every((link) => link.winner && link.loser)).toBe(true);
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
