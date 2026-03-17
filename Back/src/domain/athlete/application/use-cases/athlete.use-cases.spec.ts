import { beforeEach, describe, expect, it } from 'vitest';
import { makeAthlete } from '../../../../../test/factories';
import { InMemoryAthleteRepository } from '../../../../../test/repositories/in-memory';
import { NotFoundError } from '../../../../shared/errors/not-found.error';
import { CreateAthleteUseCase } from './create-athlete.use-case';
import { GetAthleteUseCase } from './get-athlete.use-case';
import { SearchAthletesUseCase } from './search-athletes.use-case';
import { UpdateAthleteUseCase } from './update-athlete.use-case';

describe('Athlete use cases', () => {
  let repository: InMemoryAthleteRepository;

  beforeEach(() => {
    repository = new InMemoryAthleteRepository();
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

  it('should search athletes by partial name and team', async () => {
    repository.setAthletes([
      makeAthlete({ id: 1, competitionId: 10, fullName: 'Ana Silva', teamId: 3 }),
      makeAthlete({ id: 2, competitionId: 10, fullName: 'Ana Costa', teamId: 4 }),
      makeAthlete({ id: 3, competitionId: 10, fullName: 'Bruna Silva', teamId: 3 }),
      makeAthlete({ id: 4, competitionId: 11, fullName: 'Ana Silva', teamId: 3 }),
    ]);

    const useCase = new SearchAthletesUseCase(repository);
    const result = await useCase.execute({
      competitionId: 10,
      query: 'ana',
      teamId: 3,
    });

    expect(result.map((athlete) => athlete.id)).toEqual([1]);
  });
});
