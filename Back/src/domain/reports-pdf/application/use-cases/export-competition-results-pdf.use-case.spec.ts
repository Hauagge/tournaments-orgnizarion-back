import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChampionAcademiesReportUseCase } from '@/domain/reports/application/use-cases/champion-academies-report.use-case';
import { CompetitionResultsUseCase } from '@/domain/reports/application/use-cases/competition-results.use-case';
import { CategoryResultView } from '@/domain/reports/application/use-cases/competition-results.view';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { makeCompetition } from '../../../../../test/factories/competition.factory';
import { InMemoryCompetitionRepository } from '../../../../../test/repositories/in-memory';
import { PdfRendererService } from '../services/pdf-renderer.service';
import { TemplateRendererService } from '../services/template-renderer.service';
import { ExportCompetitionResultsPdfUseCase } from './export-competition-results-pdf.use-case';

function makeCategoryResult(
  overrides: Partial<CategoryResultView> = {},
): CategoryResultView {
  return {
    categoryId: 4,
    keyGroupId: null,
    categoryName: 'Adulto Azul Leve',
    belt: 'Azul',
    ageDivision: 'Adulto',
    weightDivision: 'Leve',
    totalAthletes: 4,
    decided: true,
    first: {
      athleteId: 1,
      athleteName: 'Ana',
      academyId: 1,
      academyName: 'Alliance',
    },
    second: {
      athleteId: 2,
      athleteName: 'Bia',
      academyId: null,
      academyName: null,
    },
    thirds: [
      {
        athleteId: 3,
        athleteName: 'Caio',
        academyId: 2,
        academyName: 'Gracie',
      },
    ],
    secondarySeries: null,
    ...overrides,
  };
}

describe('ExportCompetitionResultsPdfUseCase', () => {
  const competitionResults = {
    execute: vi.fn(),
  } as unknown as CompetitionResultsUseCase;
  const championAcademies = {
    execute: vi.fn(),
  } as unknown as ChampionAcademiesReportUseCase;
  const templateRenderer = {
    render: vi.fn(),
  } as unknown as TemplateRendererService;
  const pdfRenderer = {
    renderFromHtml: vi.fn(),
  } as unknown as PdfRendererService;

  const useCase = new ExportCompetitionResultsPdfUseCase(
    new InMemoryCompetitionRepository([
      makeCompetition({ id: 1, name: 'Copa São Paulo' }),
    ]),
    competitionResults,
    championAcademies,
    templateRenderer,
    pdfRenderer,
  );

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(templateRenderer.render).mockResolvedValue('<html />');
    vi.mocked(pdfRenderer.renderFromHtml).mockResolvedValue(Buffer.from('pdf'));
    vi.mocked(championAcademies.execute).mockResolvedValue({
      competitionId: 1,
      totalChampionAthletes: 2,
      academies: [
        {
          position: 1,
          academyId: 1,
          academyName: 'Alliance',
          totalChampions: 2,
          totalSilvers: 1,
          totalBronzes: 3,
          champions: [],
        },
      ],
    });
    vi.mocked(competitionResults.execute).mockResolvedValue({
      competitionId: 1,
      totalCategories: 2,
      decidedCategories: 1,
      categories: [
        makeCategoryResult(),
        makeCategoryResult({
          categoryId: 5,
          categoryName: 'Adulto Roxa Leve',
          decided: false,
          first: null,
          second: null,
          thirds: [],
        }),
      ],
    });
  });

  it('renders the academy ranking and the podium of each category', async () => {
    const result = await useCase.execute(1);

    expect(templateRenderer.render).toHaveBeenCalledWith(
      'competition-results-report.hbs',
      expect.objectContaining({
        competitionName: 'Copa São Paulo',
        totalCategories: 2,
        decidedCategories: 1,
        academies: [
          {
            position: 1,
            academyName: 'Alliance',
            totalChampions: 2,
            totalSilvers: 1,
            totalBronzes: 3,
          },
        ],
        podiums: [
          {
            categoryName: 'Adulto Azul Leve',
            decided: true,
            first: 'Ana (Alliance)',
            second: 'Bia',
            thirds: ['Caio (Gracie)'],
          },
          {
            categoryName: 'Adulto Roxa Leve',
            decided: false,
            first: null,
            second: null,
            thirds: [],
          },
        ],
      }),
    );
    expect(result.buffer).toEqual(Buffer.from('pdf'));
    expect(result.fileName).toBe('copa-sao-paulo-resultados.pdf');
  });

  it('adds the secondary series podium as its own row', async () => {
    vi.mocked(competitionResults.execute).mockResolvedValue({
      competitionId: 1,
      totalCategories: 1,
      decidedCategories: 1,
      categories: [
        makeCategoryResult({
          secondarySeries: {
            label: 'Série Prata',
            countsForAcademyRanking: false,
            first: {
              athleteId: 9,
              athleteName: 'Duda',
              academyId: 1,
              academyName: 'Alliance',
            },
            second: null,
            thirds: [],
          },
        }),
      ],
    });

    await useCase.execute(1);

    const context = vi.mocked(templateRenderer.render).mock.calls[0][1] as {
      podiums: Array<{ categoryName: string; first: string | null }>;
    };

    expect(context.podiums.map((podium) => podium.categoryName)).toEqual([
      'Adulto Azul Leve',
      'Adulto Azul Leve · Série Prata',
    ]);
    expect(context.podiums[1].first).toBe('Duda (Alliance)');
  });

  it('throws NotFoundError when the competition does not exist', async () => {
    await expect(useCase.execute(999)).rejects.toBeInstanceOf(NotFoundError);
  });
});
