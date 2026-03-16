import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeCompetition } from '../../../../../test/factories';
import { NotFoundError } from '../../../../shared/errors/not-found.error';
import { CompetitionRepository } from './competition.repository';
import { CompetitionTypeOrmEntity } from './entities/competition.entity';

describe('CompetitionRepository', () => {
  const ormEntity: CompetitionTypeOrmEntity = {
    id: 1,
    name: 'Competition Test',
    mode: makeCompetition().mode,
    fightDurationSeconds: 300,
    weighInMarginGrams: 500,
    ageSplitYears: 2,
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
  };

  const repositoryMock = {
    create: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    findOneBy: vi.fn(),
  };

  const repository = new CompetitionRepository(repositoryMock as any);

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should create a competition', async () => {
    repositoryMock.create.mockReturnValue(ormEntity);
    repositoryMock.save.mockResolvedValue(ormEntity);

    const result = await repository.create(makeCompetition({ id: 1 }));

    expect(repositoryMock.create).toHaveBeenCalledOnce();
    expect(repositoryMock.save).toHaveBeenCalledWith(ormEntity);
    expect(result.toJSON()).toEqual(makeCompetition({ id: 1 }).toJSON());
  });

  it('should update a competition', async () => {
    repositoryMock.update.mockResolvedValue(undefined);
    repositoryMock.findOneBy.mockResolvedValue(ormEntity);

    const result = await repository.update(makeCompetition({ id: 1 }));

    expect(repositoryMock.update).toHaveBeenCalledOnce();
    expect(result.id).toBe(1);
  });

  it('should throw NotFoundError when updated entity is missing', async () => {
    repositoryMock.update.mockResolvedValue(undefined);
    repositoryMock.findOneBy.mockResolvedValue(null);

    await expect(repository.update(makeCompetition({ id: 1 }))).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('should find by id', async () => {
    repositoryMock.findOneBy.mockResolvedValue(ormEntity);

    const result = await repository.findById(1);

    expect(result?.id).toBe(1);
  });

  it('should return null when competition does not exist', async () => {
    repositoryMock.findOneBy.mockResolvedValue(null);

    const result = await repository.findById(999);

    expect(result).toBeNull();
  });

  it('should list competitions with pagination', async () => {
    repositoryMock.findAndCount = vi.fn().mockResolvedValue([[ormEntity], 1]);

    const result = await repository.list({
      page: 2,
      pageSize: 5,
    });

    expect(repositoryMock.findAndCount).toHaveBeenCalledWith({
      order: {
        createdAt: 'DESC',
      },
      skip: 5,
      take: 5,
    });
    expect(result[1]).toBe(1);
    expect(result[0][0].id).toBe(1);
  });
});
