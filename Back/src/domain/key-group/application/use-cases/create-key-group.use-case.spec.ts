import { beforeEach, describe, expect, it } from 'vitest';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { makeAthlete, makeCategory, makeCompetition } from '../../../../../test/factories';
import {
  InMemoryAthleteRepository,
  InMemoryCategoryRepository,
  InMemoryCompetitionRepository,
  InMemoryKeyGroupRepository,
} from '../../../../../test/repositories/in-memory';
import { KeyGroup } from '../../domain/entities/key-group.entity';
import { KeyGroupMember } from '../../domain/entities/key-group-member.entity';
import { KeyGroupStatus } from '../../domain/value-objects/key-group-status.enum';
import { CreateKeyGroupUseCase } from './create-key-group.use-case';

describe('CreateKeyGroupUseCase', () => {
  let competitionRepository: InMemoryCompetitionRepository;
  let categoryRepository: InMemoryCategoryRepository;
  let athleteRepository: InMemoryAthleteRepository;
  let keyGroupRepository: InMemoryKeyGroupRepository;

  beforeEach(() => {
    competitionRepository = new InMemoryCompetitionRepository([
      makeCompetition({ id: 1, mode: CompetitionMode.KEYS }),
    ]);
    categoryRepository = new InMemoryCategoryRepository([
      makeCategory({ id: 5, competitionId: 1 }),
    ]);
    athleteRepository = new InMemoryAthleteRepository([
      makeAthlete({ id: 10, competitionId: 1 }),
      makeAthlete({ id: 20, competitionId: 1 }),
    ]);
    keyGroupRepository = new InMemoryKeyGroupRepository();
  });

  function makeUseCase() {
    return new CreateKeyGroupUseCase(
      competitionRepository,
      categoryRepository,
      athleteRepository,
      keyGroupRepository,
    );
  }

  it('creates a READY key group when two athletes are provided', async () => {
    const useCase = makeUseCase();

    const details = await useCase.execute({
      competitionId: 1,
      categoryId: 5,
      athleteIds: [10, 20],
    });

    expect(details.status).toBe(KeyGroupStatus.READY);
    expect(details.members).toHaveLength(2);
  });

  it('creates a DRAFT key group when fewer than two athletes are provided', async () => {
    const useCase = makeUseCase();

    const details = await useCase.execute({
      competitionId: 1,
      athleteIds: [10],
    });

    expect(details.status).toBe(KeyGroupStatus.DRAFT);
    expect(details.members).toHaveLength(1);
  });

  it('creates an empty DRAFT key group when no athletes are provided', async () => {
    const useCase = makeUseCase();

    const details = await useCase.execute({ competitionId: 1 });

    expect(details.status).toBe(KeyGroupStatus.DRAFT);
    expect(details.members).toHaveLength(0);
  });

  it('throws NotFoundError when the competition does not exist', async () => {
    const useCase = makeUseCase();

    await expect(useCase.execute({ competitionId: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects competitions that are not in KEYS mode', async () => {
    competitionRepository = new InMemoryCompetitionRepository([
      makeCompetition({ id: 1, mode: CompetitionMode.ABSOLUTE_GP }),
    ]);
    const useCase = makeUseCase();

    await expect(useCase.execute({ competitionId: 1 })).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects a category that does not belong to the competition', async () => {
    const useCase = makeUseCase();

    await expect(
      useCase.execute({ competitionId: 1, categoryId: 999 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects duplicated athleteIds', async () => {
    const useCase = makeUseCase();

    await expect(
      useCase.execute({ competitionId: 1, athleteIds: [10, 10] }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws NotFoundError when an athlete does not exist', async () => {
    const useCase = makeUseCase();

    await expect(
      useCase.execute({ competitionId: 1, athleteIds: [999] }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects an athlete that belongs to a different competition', async () => {
    athleteRepository = new InMemoryAthleteRepository([
      makeAthlete({ id: 10, competitionId: 2 }),
    ]);
    const useCase = makeUseCase();

    await expect(
      useCase.execute({ competitionId: 1, athleteIds: [10] }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects an athlete already assigned to another key group', async () => {
    keyGroupRepository = new InMemoryKeyGroupRepository(
      [
        KeyGroup.restore({
          id: 999,
          competitionId: 1,
          categoryId: null,
          name: 'Existing group',
          status: KeyGroupStatus.READY,
          createdAt: new Date(),
        }),
      ],
      [KeyGroupMember.restore({ id: 1, keyGroupId: 999, athleteId: 10, createdAt: new Date() })],
    );
    const useCase = makeUseCase();

    await expect(
      useCase.execute({ competitionId: 1, athleteIds: [10] }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
