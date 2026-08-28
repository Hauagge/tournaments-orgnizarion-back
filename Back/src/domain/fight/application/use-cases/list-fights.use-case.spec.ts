import { beforeEach, describe, expect, it } from 'vitest';
import { KeyGroup } from '@/domain/key-group/domain/entities/key-group.entity';
import { KeyGroupStatus } from '@/domain/key-group/domain/value-objects/key-group-status.enum';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { makeCategory } from '../../../../../test/factories/category.factory';
import { makeCompetition } from '../../../../../test/factories/competition.factory';
import {
  makeUser,
  makeUserCompetitionLink,
} from '../../../../../test/factories/user.factory';
import { makeAthlete } from '../../../../../test/factories/athlete.factory';
import { makeAcademy } from '../../../../../test/factories/academy.factory';
import {
  InMemoryAcademyRepository,
  InMemoryAthleteRepository,
  InMemoryAuthRepository,
  InMemoryCategoryRepository,
  InMemoryCompetitionRepository,
  InMemoryFightRepository,
  InMemoryKeyGroupRepository,
} from '../../../../../test/repositories/in-memory';
import { FightEntity } from '../../domain/entities/fight.entity';
import { FightStatus } from '../../domain/value-objects/fight-status.enum';
import { ListFightsUseCase } from './list-fights.use-case';

function makeFight(
  overrides: Partial<Parameters<typeof FightEntity.restore>[0]> = {},
) {
  return FightEntity.restore({
    id: 1,
    competitionId: 1,
    categoryId: 4,
    keyGroupId: 8,
    round: 1,
    order: 1,
    areaId: null,
    areaName: null,
    status: FightStatus.PENDING,
    athleteAId: 10,
    athleteBId: 20,
    winType: null,
    startedAt: null,
    finishedAt: null,
    ...overrides,
  });
}

describe('ListFightsUseCase', () => {
  let useCase: ListFightsUseCase;
  let fightRepository: InMemoryFightRepository;

  beforeEach(() => {
    fightRepository = new InMemoryFightRepository([
      makeFight({ id: 1 }),
      makeFight({ id: 2, categoryId: null, keyGroupId: 8 }),
      makeFight({ id: 3, categoryId: null, keyGroupId: null }),
    ]);

    useCase = new ListFightsUseCase(
      new InMemoryCompetitionRepository([makeCompetition({ id: 1 })]),
      new InMemoryAuthRepository([
        makeUser({
          id: 1,
          competitionLinks: [makeUserCompetitionLink({ userId: 1, competitionId: 1 })],
        }),
      ]),
      fightRepository,
      new InMemoryAthleteRepository([
        makeAthlete({ id: 10, fullName: 'Atleta A', academyId: 1 }),
        makeAthlete({ id: 20, fullName: 'Atleta B', academyId: null }),
      ]),
      new InMemoryAcademyRepository([
        makeAcademy({ id: 1, competitionId: 1, name: 'Alliance' }),
      ]),
      new InMemoryCategoryRepository([
        makeCategory({ id: 4, competitionId: 1, name: 'Adulto Azul Leve' }),
      ]),
      new InMemoryKeyGroupRepository([
        KeyGroup.restore({
          id: 8,
          competitionId: 1,
          categoryId: 4,
          name: 'Chave A',
          status: KeyGroupStatus.READY,
          createdAt: new Date('2026-01-10T00:00:00.000Z'),
        }),
      ]),
    );
  });

  it('returns the category and key group names of each fight', async () => {
    const fights = await useCase.execute({ currentUserId: 1, competitionId: 1 });

    expect(fights.find((fight) => fight.id === 1)).toEqual(
      expect.objectContaining({
        id: 1,
        categoryName: 'Adulto Azul Leve',
        keyGroupName: 'Chave A',
      }),
    );
  });

  it('returns null names when the fight has no category or key group', async () => {
    const fights = await useCase.execute({ currentUserId: 1, competitionId: 1 });

    expect(fights.find((fight) => fight.id === 2)).toEqual(
      expect.objectContaining({ categoryName: null, keyGroupName: 'Chave A' }),
    );
    expect(fights.find((fight) => fight.id === 3)).toEqual(
      expect.objectContaining({ categoryName: null, keyGroupName: null }),
    );
  });

  it('throws NotFoundError when the competition does not exist', async () => {
    await expect(
      useCase.execute({ currentUserId: 1, competitionId: 999 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
