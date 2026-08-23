import { describe, expect, it } from 'vitest';
import { makeAthlete } from '../../../../../test/factories';
import { AbsoluteGpFightGenerationStrategy } from './absolute-gp-fight-generation.strategy';

function makeAthletes(count: number) {
  return Array.from({ length: count }, (_, index) =>
    makeAthlete({ id: index + 1 }),
  );
}

describe('AbsoluteGpFightGenerationStrategy', () => {
  const strategy = new AbsoluteGpFightGenerationStrategy();

  it.each([3, 5, 6, 7, 9, 10, 11, 12, 13, 14])(
    'never pairs two byes together when the category has %i athletes',
    (athleteCount) => {
      const result = strategy.generate({
        competitionId: 1,
        categoryId: 1,
        athletes: makeAthletes(athleteCount),
      });

      const round1Fights = result.fights.filter(
        (fight) => fight.toJSON().round === 1,
      );

      for (const fight of round1Fights) {
        const { athleteAId, athleteBId } = fight.toJSON();
        const isDoubleBye = athleteAId === null && athleteBId === null;
        expect(isDoubleBye).toBe(false);
      }
    },
  );

  it('gives every real athlete exactly one slot in round 1', () => {
    const athletes = makeAthletes(5);

    const result = strategy.generate({
      competitionId: 1,
      categoryId: 1,
      athletes,
    });

    const round1Fights = result.fights.filter(
      (fight) => fight.toJSON().round === 1,
    );
    const seededIds = round1Fights.flatMap((fight) => {
      const { athleteAId, athleteBId } = fight.toJSON();
      return [athleteAId, athleteBId];
    });

    expect(seededIds.filter((id) => id !== null).sort()).toEqual(
      athletes.map((athlete) => athlete.id).sort(),
    );
  });
});
