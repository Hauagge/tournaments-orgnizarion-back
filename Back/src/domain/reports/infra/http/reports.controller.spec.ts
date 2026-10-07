import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChampionAcademiesReportUseCase } from '../../application/use-cases/champion-academies-report.use-case';
import { CompetitionResultsUseCase } from '../../application/use-cases/competition-results.use-case';
import { CompetitionResultsView } from '../../application/use-cases/competition-results.view';
import { ReportsController } from './reports.controller';

describe('ReportsController', () => {
  const championAcademiesReportUseCase = {
    execute: vi.fn(),
  } as unknown as ChampionAcademiesReportUseCase;
  const competitionResultsUseCase = {
    execute: vi.fn(),
  } as unknown as CompetitionResultsUseCase;

  const controller = new ReportsController(
    championAcademiesReportUseCase,
    competitionResultsUseCase,
  );

  const emptyResults: CompetitionResultsView = {
    competitionId: 1,
    totalCategories: 0,
    decidedCategories: 0,
    categories: [],
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('wraps the results report in the { data, error } envelope', async () => {
    const report: CompetitionResultsView = {
      competitionId: 1,
      totalCategories: 1,
      decidedCategories: 1,
      categories: [
        {
          categoryId: 9,
          keyGroupId: null,
          categoryName: 'Masculino - Juvenil - BRANCA - Pena',
          belt: 'BRANCA',
          ageDivision: '16-17 anos',
          weightDivision: '58,5 kg - 64,0 kg',
          totalAthletes: 6,
          decided: true,
          first: {
            athleteId: 1,
            athleteName: 'Campeao',
            academyId: 3,
            academyName: 'Academia A',
          },
          second: null,
          thirds: [],
          secondarySeries: null,
        },
      ],
    };
    vi.mocked(competitionResultsUseCase.execute).mockResolvedValue(report);

    const response = await controller.results({ id: 1 });

    expect(response).toEqual({ data: report, error: null });
  });

  it('forwards the belt filter and drops it when blank', async () => {
    vi.mocked(competitionResultsUseCase.execute).mockResolvedValue(
      emptyResults,
    );

    await controller.results({ id: 5 }, 'BRANCA');
    expect(competitionResultsUseCase.execute).toHaveBeenCalledWith({
      competitionId: 5,
      belt: 'BRANCA',
      onlyDecided: false,
    });

    // Uma faixa em branco vinda da query string nao pode virar filtro: filtraria
    // todas as categorias para fora.
    await controller.results({ id: 5 }, '   ');
    expect(competitionResultsUseCase.execute).toHaveBeenLastCalledWith({
      competitionId: 5,
      belt: undefined,
      onlyDecided: false,
    });
  });

  it('treats onlyDecided as true only for the exact "true" string', async () => {
    vi.mocked(competitionResultsUseCase.execute).mockResolvedValue(
      emptyResults,
    );

    await controller.results({ id: 2 }, undefined, 'true');
    expect(competitionResultsUseCase.execute).toHaveBeenLastCalledWith(
      expect.objectContaining({ onlyDecided: true }),
    );

    for (const value of ['false', '1', '', undefined]) {
      await controller.results({ id: 2 }, undefined, value);
      expect(competitionResultsUseCase.execute).toHaveBeenLastCalledWith(
        expect.objectContaining({ onlyDecided: false }),
      );
    }
  });

  it('wraps the champion academies report in the same envelope', async () => {
    const report = {
      competitionId: 1,
      totalChampionAthletes: 2,
      academies: [],
    };
    vi.mocked(championAcademiesReportUseCase.execute).mockResolvedValue(report);

    const response = await controller.championAcademies(
      { id: 1 },
      {
        belt: 'AZUL',
        ageDivision: undefined,
        categoryId: undefined,
      },
    );

    expect(championAcademiesReportUseCase.execute).toHaveBeenCalledWith({
      competitionId: 1,
      belt: 'AZUL',
      ageDivision: undefined,
      categoryId: undefined,
    });
    expect(response).toEqual({ data: report, error: null });
  });
});
