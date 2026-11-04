import { beforeEach, describe, expect, it } from 'vitest';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import {
  InMemoryFightRepository,
  InMemoryKeyGroupRepository,
} from '../../../../../test/repositories/in-memory';
import { KeyGroup } from '../../domain/entities/key-group.entity';
import { KeyGroupMember } from '../../domain/entities/key-group-member.entity';
import { KeyGroupStatus } from '../../domain/value-objects/key-group-status.enum';
import { KeyGroupChampionService } from '../services/key-group-champion.service';
import { SetKeyGroupPodiumUseCase } from './set-key-group-podium.use-case';

function makeGroup(status = KeyGroupStatus.READY) {
  return KeyGroup.restore({
    id: 5,
    competitionId: 1,
    categoryId: null,
    name: 'Chave Leve',
    status,
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
    championAthleteId: null,
  });
}

function membersOf(athleteIds: number[]) {
  return athleteIds.map((athleteId) =>
    KeyGroupMember.restore({
      id: 500 + athleteId,
      keyGroupId: 5,
      athleteId,
      createdAt: new Date('2026-01-10T00:00:00.000Z'),
    }),
  );
}

function makeUseCase(repository: InMemoryKeyGroupRepository) {
  return new SetKeyGroupPodiumUseCase(
    repository,
    new InMemoryFightRepository([]),
    new KeyGroupChampionService(),
  );
}

describe('SetKeyGroupPodiumUseCase', () => {
  let repository: InMemoryKeyGroupRepository;
  let useCase: SetKeyGroupPodiumUseCase;

  beforeEach(() => {
    repository = new InMemoryKeyGroupRepository(
      [makeGroup()],
      membersOf([1, 2, 3]),
    );
    useCase = makeUseCase(repository);
  });

  it('grava o primeiro e o segundo e marca o primeiro como campeao', async () => {
    const group = await useCase.execute({
      id: 5,
      firstAthleteId: 2,
      secondAthleteId: 3,
    });

    expect(group.manualFirstAthleteId).toBe(2);
    expect(group.manualSecondAthleteId).toBe(3);
    expect(group.championAthleteId).toBe(2);
    expect((await repository.findById(5))?.manualFirstAthleteId).toBe(2);
  });

  it('funciona em chave travada, que e quando as lutas acontecem', async () => {
    repository = new InMemoryKeyGroupRepository(
      [makeGroup(KeyGroupStatus.LOCKED)],
      membersOf([1, 2]),
    );
    useCase = makeUseCase(repository);

    await expect(
      useCase.execute({ id: 5, firstAthleteId: 1, secondAthleteId: 2 }),
    ).resolves.toMatchObject({ manualFirstAthleteId: 1 });
  });

  it('limpa a marcacao quando recebe null', async () => {
    await useCase.execute({ id: 5, firstAthleteId: 2, secondAthleteId: 3 });

    const group = await useCase.execute({
      id: 5,
      firstAthleteId: null,
      secondAthleteId: null,
    });

    expect(group.manualFirstAthleteId).toBeNull();
    expect(group.manualSecondAthleteId).toBeNull();
    expect(group.championAthleteId).toBeNull();
  });

  it('rejeita o mesmo atleta em primeiro e segundo', async () => {
    await expect(
      useCase.execute({ id: 5, firstAthleteId: 2, secondAthleteId: 2 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejeita atleta que nao e da chave', async () => {
    await expect(
      useCase.execute({ id: 5, firstAthleteId: 99, secondAthleteId: null }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('falha quando a chave nao existe', async () => {
    await expect(
      useCase.execute({ id: 404, firstAthleteId: 1, secondAthleteId: null }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
