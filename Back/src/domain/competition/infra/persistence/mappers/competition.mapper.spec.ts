import { describe, expect, it } from 'vitest';
import { makeCompetition } from '../../../../../../test/factories';
import { CompetitionMapper } from './competition.mapper';

describe('CompetitionMapper', () => {
  it('should map to persistence', () => {
    const competition = makeCompetition();

    const entity = CompetitionMapper.toPersistence(competition);

    expect(entity).toMatchObject(competition.toJSON());
  });

  it('should map to domain', () => {
    const entity = CompetitionMapper.toPersistence(makeCompetition({ id: 5 }));

    const competition = CompetitionMapper.toDomain(entity);

    expect(competition.toJSON()).toEqual(makeCompetition({ id: 5 }).toJSON());
  });
});
