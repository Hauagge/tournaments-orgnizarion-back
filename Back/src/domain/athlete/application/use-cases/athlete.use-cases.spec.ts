import { beforeEach, describe, expect, it } from 'vitest';
import { makeAthlete, makeTeam } from '../../../../../test/factories';
import {
  InMemoryAthleteRepository,
  InMemoryTeamRepository,
  InMemoryWeighInRepository,
} from '../../../../../test/repositories/in-memory';
import { WeighIn } from '@/domain/weighin/domain/entities/weigh-in.entity';
import { WeighInStatus } from '@/domain/weighin/domain/value-objects/weigh-in-status.enum';
import { NotFoundError } from '../../../../shared/errors/not-found.error';
import { CreateAthleteUseCase } from './create-athlete.use-case';
import { GetAthleteUseCase } from './get-athlete.use-case';
import { SearchAthletesUseCase } from './search-athletes.use-case';
import { UpdateAthleteUseCase } from './update-athlete.use-case';

describe('Athlete use cases', () => {
  let repository: InMemoryAthleteRepository;
  let teamRepository: InMemoryTeamRepository;
  let weighInRepository: InMemoryWeighInRepository;

  beforeEach(() => {
    repository = new InMemoryAthleteRepository();
    teamRepository = new InMemoryTeamRepository();
    weighInRepository = new InMemoryWeighInRepository();
  });

  it('should create athlete with normalized name', async () => {
    const useCase = new CreateAthleteUseCase(repository);

    const result = await useCase.execute({
      competitionId: 1,
      fullName: '  Ana   Maria  Silva ',
      birthDate: new Date('2010-05-10T00:00:00.000Z'),
      belt: ' white ',
      declaredWeightGrams: 50000,
      teamId: null,
    });

    expect(result.id).toBe(1);
    expect(result.fullName).toBe('Ana Maria Silva');
    expect(result.belt).toBe('white');
  });

  it('should get athlete by id', async () => {
    repository.setAthletes([makeAthlete({ id: 7 })]);

    const useCase = new GetAthleteUseCase(repository);
    const result = await useCase.execute(7);

    expect(result.id).toBe(7);
  });

  it('should throw NotFoundError when athlete does not exist', async () => {
    const useCase = new GetAthleteUseCase(repository);

    await expect(useCase.execute(99)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should update athlete fields', async () => {
    repository.setAthletes([makeAthlete({ id: 5 })]);

    const useCase = new UpdateAthleteUseCase(repository);
    const result = await useCase.execute({
      id: 5,
      fullName: '  Julia   Costa ',
      declaredWeightGrams: 47000,
      teamId: null,
    });

    expect(result.toJSON()).toMatchObject({
      id: 5,
      fullName: 'Julia Costa',
      declaredWeightGrams: 47000,
      teamId: null,
    });
  });

  it('should preserve untouched fields on update', async () => {
    repository.setAthletes([makeAthlete({ id: 6, belt: 'yellow' })]);

    const useCase = new UpdateAthleteUseCase(repository);
    const result = await useCase.execute({
      id: 6,
      teamId: 10,
    });

    expect(result.toJSON()).toMatchObject({
      id: 6,
      belt: 'yellow',
      teamId: 10,
    });
  });

  it('should throw NotFoundError when updating missing athlete', async () => {
    const useCase = new UpdateAthleteUseCase(repository);

    await expect(useCase.execute({ id: 88, belt: 'orange' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('should search athletes by partial name and team with weigh-in status and team name', async () => {
    repository.setAthletes([
      makeAthlete({ id: 1, competitionId: 10, fullName: 'Ana Silva', teamId: 3 }),
      makeAthlete({ id: 2, competitionId: 10, fullName: 'Ana Costa', teamId: 4 }),
      makeAthlete({ id: 3, competitionId: 10, fullName: 'Bruna Silva', teamId: 3 }),
      makeAthlete({ id: 4, competitionId: 11, fullName: 'Ana Silva', teamId: 3 }),
    ]);
    teamRepository = new InMemoryTeamRepository([
      makeTeam({ id: 3, competitionId: 10, name: 'Equipe A' }),
      makeTeam({ id: 4, competitionId: 10, name: 'Equipe B' }),
    ]);
    weighInRepository.setWeighIns([
      WeighIn.restore({
        id: 50,
        competitionId: 10,
        athleteId: 1,
        measuredWeightGrams: 50000,
        status: WeighInStatus.APPROVED,
        performedAt: new Date('2026-01-01T10:00:00.000Z'),
        performedBy: 'mesa-1',
      }),
    ]);

    const useCase = new SearchAthletesUseCase(
      repository,
      teamRepository,
      weighInRepository,
    );
    const result = await useCase.execute({
      competitionId: 10,
      query: 'ana',
      teamId: 3,
    });

    expect(result).toEqual([
      expect.objectContaining({
        id: 1,
        teamName: 'Equipe A',
        weighInStatus: WeighInStatus.APPROVED,
      }),
    ]);
  });

  it('should return null team name and pending weigh-in status when athlete has no team or weigh-in record', async () => {
    repository.setAthletes([
      makeAthlete({ id: 9, competitionId: 12, fullName: 'Marina Costa', teamId: null }),
    ]);

    const useCase = new SearchAthletesUseCase(
      repository,
      teamRepository,
      weighInRepository,
    );
    const result = await useCase.execute({
      competitionId: 12,
    });

    expect(result).toEqual([
      expect.objectContaining({
        id: 9,
        teamName: null,
        weighInStatus: WeighInStatus.PENDING,
      }),
    ]);
  });
});
