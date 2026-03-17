import { describe, expect, it } from 'vitest';
import { makeAthlete } from '../../../../../../test/factories';
import { AthleteMapper } from './athlete.mapper';

describe('AthleteMapper', () => {
  it('should map athlete to persistence', () => {
    const athlete = makeAthlete();

    const entity = AthleteMapper.toPersistence(athlete);

    expect(entity).toMatchObject(athlete.toJSON());
  });

  it('should map athlete to domain', () => {
    const entity = AthleteMapper.toPersistence(makeAthlete({ id: 5 }));

    const athlete = AthleteMapper.toDomain(entity);

    expect(athlete.toJSON()).toEqual(makeAthlete({ id: 5 }).toJSON());
  });
});
