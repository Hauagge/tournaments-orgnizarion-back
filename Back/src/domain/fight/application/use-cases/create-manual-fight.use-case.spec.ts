import { beforeEach, describe, expect, it } from 'vitest';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { makeAthlete, makeCategory } from '../../../../../test/factories';
import {
  InMemoryAthleteRepository,
  InMemoryCategoryRepository,
  InMemoryFightRepository,
} from '../../../../../test/repositories/in-memory';
import { FightEntity } from '../../domain/entities/fight.entity';
import { CreateManualFightUseCase } from './create-manual-fight.use-case';

describe('CreateManualFightUseCase', () => {
  let athleteRepository: InMemoryAthleteRepository;
  let categoryRepository: InMemoryCategoryRepository;
  let fightRepository: InMemoryFightRepository;

  beforeEach(() => {
    athleteRepository = new InMemoryAthleteRepository([
      makeAthlete({ id: 10, competitionId: 1 }),
      makeAthlete({ id: 20, competitionId: 1 }),
    ]);
    categoryRepository = new InMemoryCategoryRepository(
      [makeCategory({ id: 1, competitionId: 1 })],
      [
        { categoryId: 1, athleteId: 10 },
        { categoryId: 1, athleteId: 20 },
      ],
    );
    fightRepository = new InMemoryFightRepository();
  });

  function makeUseCase() {
    return new CreateManualFightUseCase(categoryRepository, athleteRepository, fightRepository);
  }

  it('creates a manual fight between two distinct athletes of the competition', async () => {
    const useCase = makeUseCase();

    const fight = await useCase.execute({
      currentUserId: 1,
      competitionId: 1,
      athleteAId: 10,
      athleteBId: 20,
      round: 1,
      order: 1,
    });

    expect(fight.athleteAId).toBe(10);
    expect(fight.athleteBId).toBe(20);
    expect(fight.createdManually).toBe(true);
  });

  it('rejects a fight between the same athlete twice', async () => {
    const useCase = makeUseCase();

    await expect(
      useCase.execute({
        currentUserId: 1,
        competitionId: 1,
        athleteAId: 10,
        athleteBId: 10,
        round: 1,
        order: 1,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws NotFoundError when the category does not belong to the competition', async () => {
    const useCase = makeUseCase();

    await expect(
      useCase.execute({
        currentUserId: 1,
        competitionId: 1,
        athleteAId: 10,
        athleteBId: 20,
        round: 1,
        order: 1,
        categoryId: 999,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects athletes that do not belong to the competition', async () => {
    athleteRepository = new InMemoryAthleteRepository([
      makeAthlete({ id: 10, competitionId: 1 }),
      makeAthlete({ id: 20, competitionId: 2 }),
    ]);
    const useCase = makeUseCase();

    await expect(
      useCase.execute({
        currentUserId: 1,
        competitionId: 1,
        athleteAId: 10,
        athleteBId: 20,
        round: 1,
        order: 1,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects athletes that do not belong to the informed category', async () => {
    categoryRepository = new InMemoryCategoryRepository(
      [makeCategory({ id: 1, competitionId: 1 })],
      [{ categoryId: 1, athleteId: 10 }],
    );
    const useCase = makeUseCase();

    await expect(
      useCase.execute({
        currentUserId: 1,
        competitionId: 1,
        athleteAId: 10,
        athleteBId: 20,
        round: 1,
        order: 1,
        categoryId: 1,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects a duplicate active fight between the same two athletes', async () => {
    fightRepository = new InMemoryFightRepository([
      FightEntity.restore({
        id: 1,
        competitionId: 1,
        categoryId: null,
        keyGroupId: null,
        round: 1,
        order: 1,
        areaId: null,
        areaName: null,
        status: 'PENDING' as never,
        athleteAId: 10,
        athleteBId: 20,
        winType: null,
        startedAt: null,
        finishedAt: null,
      }),
    ]);
    const useCase = makeUseCase();

    await expect(
      useCase.execute({
        currentUserId: 1,
        competitionId: 1,
        athleteAId: 20,
        athleteBId: 10,
        round: 1,
        order: 2,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
