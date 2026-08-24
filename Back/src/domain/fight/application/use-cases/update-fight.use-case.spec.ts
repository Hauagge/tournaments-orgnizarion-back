import { beforeEach, describe, expect, it } from 'vitest';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { makeAthlete } from '../../../../../test/factories';
import {
  InMemoryAthleteRepository,
  InMemoryCategoryRepository,
  InMemoryFightRepository,
} from '../../../../../test/repositories/in-memory';
import { FightEntity } from '../../domain/entities/fight.entity';
import { FightStatus } from '../../domain/value-objects/fight-status.enum';
import { UpdateFightUseCase } from './update-fight.use-case';

function makeFight(overrides: Partial<Parameters<typeof FightEntity.restore>[0]> = {}) {
  return FightEntity.restore({
    id: 1,
    competitionId: 1,
    categoryId: null,
    keyGroupId: null,
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

describe('UpdateFightUseCase', () => {
  let athleteRepository: InMemoryAthleteRepository;
  let categoryRepository: InMemoryCategoryRepository;
  let fightRepository: InMemoryFightRepository;

  beforeEach(() => {
    athleteRepository = new InMemoryAthleteRepository([
      makeAthlete({ id: 10, competitionId: 1 }),
      makeAthlete({ id: 20, competitionId: 1 }),
      makeAthlete({ id: 30, competitionId: 1 }),
    ]);
    categoryRepository = new InMemoryCategoryRepository();
    fightRepository = new InMemoryFightRepository([makeFight()]);
  });

  function makeUseCase() {
    return new UpdateFightUseCase(categoryRepository, athleteRepository, fightRepository);
  }

  it('updates the fight order and area', async () => {
    const useCase = makeUseCase();

    const fight = await useCase.execute({
      currentUserId: 1,
      competitionId: 1,
      fightId: 1,
      order: 5,
      areaId: 3,
    });

    expect(fight.order).toBe(5);
    expect(fight.areaId).toBe(3);
  });

  it('replaces an athlete when it belongs to the same competition', async () => {
    const useCase = makeUseCase();

    const fight = await useCase.execute({
      currentUserId: 1,
      competitionId: 1,
      fightId: 1,
      athleteBId: 30,
    });

    expect(fight.athleteAId).toBe(10);
    expect(fight.athleteBId).toBe(30);
  });

  it('throws NotFoundError when the fight does not belong to the competition', async () => {
    fightRepository = new InMemoryFightRepository([makeFight({ competitionId: 2 })]);
    const useCase = makeUseCase();

    await expect(
      useCase.execute({ currentUserId: 1, competitionId: 1, fightId: 1 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects an athlete that does not belong to the competition', async () => {
    athleteRepository = new InMemoryAthleteRepository([
      makeAthlete({ id: 10, competitionId: 1 }),
      makeAthlete({ id: 99, competitionId: 2 }),
    ]);
    const useCase = makeUseCase();

    await expect(
      useCase.execute({ currentUserId: 1, competitionId: 1, fightId: 1, athleteBId: 99 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects an athlete outside the fight category', async () => {
    fightRepository = new InMemoryFightRepository([makeFight({ categoryId: 7 })]);
    categoryRepository = new InMemoryCategoryRepository(
      [],
      [
        { categoryId: 7, athleteId: 10 },
        { categoryId: 7, athleteId: 20 },
      ],
    );
    const useCase = makeUseCase();

    await expect(
      useCase.execute({ currentUserId: 1, competitionId: 1, fightId: 1, athleteBId: 30 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects setting both athlete slots to the same athlete', async () => {
    const useCase = makeUseCase();

    await expect(
      useCase.execute({
        currentUserId: 1,
        competitionId: 1,
        fightId: 1,
        athleteAId: 10,
        athleteBId: 10,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
