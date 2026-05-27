import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExportFightsByAreaPdfUseCase } from './export-fights-by-area-pdf.use-case';
import { FightsByAreaReportDataBuilderService } from '../services/fights-by-area-report-data-builder.service';
import { TemplateRendererService } from '../services/template-renderer.service';
import { PdfRendererService } from '../services/pdf-renderer.service';

describe('ExportFightsByAreaPdfUseCase', () => {
  const builder = {
    build: vi.fn(),
  } as unknown as FightsByAreaReportDataBuilderService;
  const templateRenderer = {
    render: vi.fn(),
  } as unknown as TemplateRendererService;
  const pdfRenderer = {
    renderFromHtml: vi.fn(),
  } as unknown as PdfRendererService;

  const useCase = new ExportFightsByAreaPdfUseCase(
    builder,
    templateRenderer,
    pdfRenderer,
  );

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should generate pdf buffer and file name', async () => {
    vi.mocked(builder.build).mockResolvedValue({
      competitionName: 'Copa São Paulo',
      exportedAt: '21/05/2026 10:00',
      sections: [{ areaName: 'Área 1', areaOrder: 1, fights: [] }],
      unassignedSection: null,
    });
    vi.mocked(templateRenderer.render).mockResolvedValue('<html />');
    vi.mocked(pdfRenderer.renderFromHtml).mockResolvedValue(Buffer.from('pdf'));

    const result = await useCase.execute(1);

    expect(templateRenderer.render).toHaveBeenCalledWith(
      'fights-by-area-report.hbs',
      expect.objectContaining({
        competitionName: 'Copa São Paulo',
        hasAreas: true,
      }),
    );
    expect(result.buffer).toEqual(Buffer.from('pdf'));
    expect(result.fileName).toBe('copa-sao-paulo-fights-by-area.pdf');
  });
});
