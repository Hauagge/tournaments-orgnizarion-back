import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeAthlete } from '../../../../../test/factories';
import { NotFoundError } from '../../../../shared/errors/not-found.error';
import { AthleteRepository } from './athlete.repository';
import { AthleteTypeOrmEntity } from './entities/athlete.typeorm-entity';

describe('AthleteRepository', () => {
  const ormEntity: AthleteTypeOrmEntity = {
    id: 1,
    competitionId: 9,
    fullName: 'Athlete Test',
    birthDate: new Date('2010-05-10'),
    belt: 'white',
    declaredWeightGrams: 50000,
    academyId: 3,
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
  };

  const repositoryMock = {
    create: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    findOneBy: vi.fn(),
    find: vi.fn(),
  };

  const repository = new AthleteRepository(repositoryMock as any);

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should create athlete', async () => {
    repositoryMock.create.mockReturnValue(ormEntity);
    repositoryMock.save.mockResolvedValue(ormEntity);

    const result = await repository.create(makeAthlete({ id: 1, competitionId: 9 }));

    expect(repositoryMock.create).toHaveBeenCalledOnce();
    expect(repositoryMock.save).toHaveBeenCalledWith(ormEntity);
    expect(result.toJSON()).toEqual(
      makeAthlete({ id: 1, competitionId: 9 }).toJSON(),
    );
  });

  it('should update athlete', async () => {
    repositoryMock.update.mockResolvedValue(undefined);
    repositoryMock.findOneBy.mockResolvedValue(ormEntity);

    const result = await repository.update(makeAthlete({ id: 1 }));

    expect(result.id).toBe(1);
  });

  it('should throw NotFoundError when updated athlete is missing', async () => {
    repositoryMock.update.mockResolvedValue(undefined);
    repositoryMock.findOneBy.mockResolvedValue(null);

    await expect(repository.update(makeAthlete({ id: 1 }))).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('should find athlete by id', async () => {
    repositoryMock.findOneBy.mockResolvedValue(ormEntity);

    const result = await repository.findById(1);

    expect(result?.id).toBe(1);
  });

  it('should search athletes', async () => {
    repositoryMock.find.mockResolvedValue([ormEntity]);

    const result = await repository.search({
      competitionId: 9,
      query: 'ath',
      academyId: 3,
    });

    expect(repositoryMock.find).toHaveBeenCalledOnce();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });
});
