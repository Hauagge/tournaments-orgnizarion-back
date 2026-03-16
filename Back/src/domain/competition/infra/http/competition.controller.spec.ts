import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeCompetition } from '../../../../../test/factories';
import { CompetitionController } from './competition.controller';
import { CreateCompetitionUseCase } from '../../application/use-cases/create-competition.use-case';
import { GetCompetitionUseCase } from '../../application/use-cases/get-competition.use-case';
import { ListCompetitionsUseCase } from '../../application/use-cases/list-competitions.use-case';
import { UpdateCompetitionSettingsUseCase } from '../../application/use-cases/update-competition-settings.use-case';
import { CompetitionMode } from '../../domain/value-objects/competition-mode.enum';

describe('CompetitionController', () => {
  const createCompetitionUseCase = {
    execute: vi.fn(),
  } as unknown as CreateCompetitionUseCase;
  const updateCompetitionSettingsUseCase = {
    execute: vi.fn(),
  } as unknown as UpdateCompetitionSettingsUseCase;
  const getCompetitionUseCase = {
    execute: vi.fn(),
  } as unknown as GetCompetitionUseCase;
  const listCompetitionsUseCase = {
    execute: vi.fn(),
  } as unknown as ListCompetitionsUseCase;

  const controller = new CompetitionController(
    createCompetitionUseCase,
    updateCompetitionSettingsUseCase,
    getCompetitionUseCase,
    listCompetitionsUseCase,
  );

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should create and return wrapped response', async () => {
    vi.mocked(createCompetitionUseCase.execute).mockResolvedValue(
      makeCompetition({ id: 1 }),
    );

    const result = await controller.create({
      name: 'Summer Cup',
      mode: CompetitionMode.TEAM,
      fightDurationSeconds: 300,
      weighInMarginGrams: 500,
      ageSplitYears: 2,
    });

    expect(result).toEqual({
      data: makeCompetition({ id: 1 }).toJSON(),
      error: null,
    });
  });

  it('should list and return wrapped paginated response', async () => {
    vi.mocked(listCompetitionsUseCase.execute).mockResolvedValue({
      items: [makeCompetition({ id: 2 }), makeCompetition({ id: 1 })],
      page: 1,
      pageSize: 2,
      total: 3,
      totalPages: 2,
    });

    const result = await controller.list({
      page: 1,
      pageSize: 2,
    });

    expect(result).toEqual({
      data: {
        items: [
          makeCompetition({ id: 2 }).toJSON(),
          makeCompetition({ id: 1 }).toJSON(),
        ],
        page: 1,
        pageSize: 2,
        total: 3,
        totalPages: 2,
      },
      error: null,
    });
  });

  it('should update and return wrapped response', async () => {
    vi.mocked(updateCompetitionSettingsUseCase.execute).mockResolvedValue(
      makeCompetition({ id: 2, name: 'Updated Cup' }),
    );

    const result = await controller.update(
      { id: 2 },
      {
        name: 'Updated Cup',
      },
    );

    expect(result).toEqual({
      data: makeCompetition({ id: 2, name: 'Updated Cup' }).toJSON(),
      error: null,
    });
  });

  it('should get by id and return wrapped response', async () => {
    vi.mocked(getCompetitionUseCase.execute).mockResolvedValue(
      makeCompetition({ id: 3 }),
    );

    const result = await controller.getById({ id: 3 });

    expect(result).toEqual({
      data: makeCompetition({ id: 3 }).toJSON(),
      error: null,
    });
  });
});
