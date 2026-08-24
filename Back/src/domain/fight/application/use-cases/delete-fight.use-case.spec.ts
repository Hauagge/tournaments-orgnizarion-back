import { describe, expect, it } from 'vitest';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { InMemoryFightRepository } from '../../../../../test/repositories/in-memory';
import { FightEntity } from '../../domain/entities/fight.entity';
import { FightStatus } from '../../domain/value-objects/fight-status.enum';
import { DeleteFightUseCase } from './delete-fight.use-case';

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
    createdManually: true,
    winnerId: null,
    nextFightId: null,
    ...overrides,
  });
}

describe('DeleteFightUseCase', () => {
  it('deletes a manual fight that has no winner or bracket progression', async () => {
    const fightRepository = new InMemoryFightRepository([makeFight()]);
    const useCase = new DeleteFightUseCase(fightRepository);

    const result = await useCase.execute({ currentUserId: 1, competitionId: 1, fightId: 1 });

    expect(result).toEqual({ deleted: true, fightId: 1 });
    expect(await fightRepository.findById(1)).toBeNull();
  });

  it('throws NotFoundError when the fight does not belong to the competition', async () => {
    const fightRepository = new InMemoryFightRepository([makeFight({ competitionId: 2 })]);
    const useCase = new DeleteFightUseCase(fightRepository);

    await expect(
      useCase.execute({ currentUserId: 1, competitionId: 1, fightId: 1 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects deleting a fight that was not created manually', async () => {
    const fightRepository = new InMemoryFightRepository([
      makeFight({ createdManually: false }),
    ]);
    const useCase = new DeleteFightUseCase(fightRepository);

    await expect(
      useCase.execute({ currentUserId: 1, competitionId: 1, fightId: 1 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects deleting a manual fight that already has a winner', async () => {
    const fightRepository = new InMemoryFightRepository([
      makeFight({ winnerId: 10 }),
    ]);
    const useCase = new DeleteFightUseCase(fightRepository);

    await expect(
      useCase.execute({ currentUserId: 1, competitionId: 1, fightId: 1 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects deleting a manual fight already linked to a next fight', async () => {
    const fightRepository = new InMemoryFightRepository([
      makeFight({ nextFightId: 2 }),
    ]);
    const useCase = new DeleteFightUseCase(fightRepository);

    await expect(
      useCase.execute({ currentUserId: 1, competitionId: 1, fightId: 1 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
