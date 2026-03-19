import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeAthlete, makeCompetition } from '../../../../../test/factories';
import { CompetitionController } from './competition.controller';
import { CreateCompetitionUseCase } from '../../application/use-cases/create-competition.use-case';
import { GetCompetitionUseCase } from '../../application/use-cases/get-competition.use-case';
import { ImportAthletesUseCase } from '../../application/use-cases/import-athletes.use-case';
import { ListCompetitionsUseCase } from '../../application/use-cases/list-competitions.use-case';
import { PreviewAthleteImportUseCase } from '../../application/use-cases/preview-athlete-import.use-case';
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
  const previewAthleteImportUseCase = {
    execute: vi.fn(),
  } as unknown as PreviewAthleteImportUseCase;
  const importAthletesUseCase = {
    execute: vi.fn(),
  } as unknown as ImportAthletesUseCase;

  const controller = new CompetitionController(
    createCompetitionUseCase,
    updateCompetitionSettingsUseCase,
    getCompetitionUseCase,
    listCompetitionsUseCase,
    previewAthleteImportUseCase,
    importAthletesUseCase,
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

  it('should preview athlete import and return wrapped response', async () => {
    vi.mocked(previewAthleteImportUseCase.execute).mockResolvedValue({
      rows: [],
      totalRows: 0,
      totalErrors: 0,
    });

    const result = await controller.previewAthletesImport(
      { id: 3 },
      { csvText: 'fullName,birthDate,belt,weight' },
    );

    expect(result).toEqual({
      data: {
        rows: [],
        totalRows: 0,
        totalErrors: 0,
      },
      error: null,
    });
  });

  it('should import athletes from uploaded csv and return wrapped response', async () => {
    vi.mocked(importAthletesUseCase.execute).mockResolvedValue({
      importedCount: 1,
      failedCount: 0,
      athletes: [makeAthlete({ id: 99 }).toJSON()],
      errors: [],
    });

    const result = await controller.importAthletes(
      { id: 7 },
      {
        buffer: Buffer.from('fullName,birthDate,belt,weight\nAna,2010-05-10,white,65'),
      },
    );

    expect(importAthletesUseCase.execute).toHaveBeenCalledWith({
      competitionId: 7,
      csvText: 'fullName,birthDate,belt,weight\nAna,2010-05-10,white,65',
    });
    expect(result).toEqual({
      data: {
        importedCount: 1,
        failedCount: 0,
        athletes: [makeAthlete({ id: 99 }).toJSON()],
        errors: [],
      },
      error: null,
    });
  });
});
