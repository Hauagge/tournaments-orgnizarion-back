import { beforeEach, describe, expect, it } from 'vitest';
import { makeCompetition } from '../../../../../test/factories';
import { InMemoryCompetitionRepository } from '../../../../../test/repositories/in-memory';
import { NotFoundError } from '../../../../shared/errors/not-found.error';
import { CreateCompetitionUseCase } from './create-competition.use-case';
import { GetCompetitionUseCase } from './get-competition.use-case';
import { ListCompetitionsUseCase } from './list-competitions.use-case';
import { UpdateCompetitionSettingsUseCase } from './update-competition-settings.use-case';
import { CompetitionMode } from '../../domain/value-objects/competition-mode.enum';

describe('Competition use cases', () => {
  let repository: InMemoryCompetitionRepository;

  beforeEach(() => {
    repository = new InMemoryCompetitionRepository();
  });

  it('should create a competition', async () => {
    const useCase = new CreateCompetitionUseCase(repository);
    const result = await useCase.execute({
      name: 'Summer Cup',
      mode: CompetitionMode.TEAM,
      fightDurationSeconds: 300,
      weighInMarginGrams: 500,
      ageSplitYears: 2,
    });

    const savedCompetition = await repository.findById(result.id as number);

    expect(result.id).toBe(1);
    expect(result.name).toBe('Summer Cup');
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(savedCompetition?.toJSON()).toEqual(result.toJSON());
  });

  it('should create a competition using the next available id', async () => {
    repository.setCompetitions([makeCompetition({ id: 9 })]);

    const useCase = new CreateCompetitionUseCase(repository);
    const result = await useCase.execute({
      name: 'Winter Cup',
      mode: CompetitionMode.ABSOLUTE_GP,
      fightDurationSeconds: 420,
      weighInMarginGrams: 250,
      ageSplitYears: 1,
    });

    expect(result.id).toBe(10);
  });

  it('should get a competition by id', async () => {
    repository.setCompetitions([makeCompetition({ id: 5 })]);

    const useCase = new GetCompetitionUseCase(repository);
    const result = await useCase.execute(5);

    expect(result.id).toBe(5);
  });

  it('should list competitions with pagination', async () => {
    repository.setCompetitions([
      makeCompetition({ id: 1, createdAt: new Date('2026-01-01T00:00:00.000Z') }),
      makeCompetition({ id: 2, createdAt: new Date('2026-01-02T00:00:00.000Z') }),
      makeCompetition({ id: 3, createdAt: new Date('2026-01-03T00:00:00.000Z') }),
    ]);

    const useCase = new ListCompetitionsUseCase(repository);
    const result = await useCase.execute({
      page: 1,
      pageSize: 2,
    });

    expect(result.total).toBe(3);
    expect(result.totalPages).toBe(2);
    expect(result.items.map((competition) => competition.id)).toEqual([3, 2]);
  });

  it('should throw NotFoundError when getting missing competition', async () => {
    const useCase = new GetCompetitionUseCase(repository);

    await expect(useCase.execute(99)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should update competition settings', async () => {
    repository.setCompetitions([makeCompetition({ id: 7 })]);

    const useCase = new UpdateCompetitionSettingsUseCase(repository);
    const result = await useCase.execute({
      id: 7,
      name: 'Updated Cup',
      mode: CompetitionMode.ABSOLUTE_GP,
      fightDurationSeconds: 600,
      weighInMarginGrams: 700,
      ageSplitYears: 3,
    });

    const savedCompetition = await repository.findById(7);

    expect(result.toJSON()).toMatchObject({
      id: 7,
      name: 'Updated Cup',
      mode: CompetitionMode.ABSOLUTE_GP,
      fightDurationSeconds: 600,
      weighInMarginGrams: 700,
      ageSplitYears: 3,
    });
    expect(savedCompetition?.toJSON()).toEqual(result.toJSON());
  });

  it('should preserve untouched fields on partial update', async () => {
    repository.setCompetitions([
      makeCompetition({
        id: 8,
        name: 'Original Cup',
        mode: CompetitionMode.TEAM,
        fightDurationSeconds: 300,
        weighInMarginGrams: 500,
        ageSplitYears: 2,
      }),
    ]);

    const useCase = new UpdateCompetitionSettingsUseCase(repository);
    const result = await useCase.execute({
      id: 8,
      fightDurationSeconds: 360,
    });

    expect(result.toJSON()).toMatchObject({
      id: 8,
      name: 'Original Cup',
      mode: CompetitionMode.TEAM,
      fightDurationSeconds: 360,
      weighInMarginGrams: 500,
      ageSplitYears: 2,
    });
  });

  it('should throw NotFoundError when updating missing competition', async () => {
    const useCase = new UpdateCompetitionSettingsUseCase(repository);

    await expect(
      useCase.execute({ id: 100, name: 'Missing Cup' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
