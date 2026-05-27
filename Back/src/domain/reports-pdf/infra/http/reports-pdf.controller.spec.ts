import { StreamableFile } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExportBracketsReportPdfUseCase } from '../../application/use-cases/export-brackets-report-pdf.use-case';
import { ExportFightsByAreaPdfUseCase } from '../../application/use-cases/export-fights-by-area-pdf.use-case';
import { ReportsPdfController } from './reports-pdf.controller';

describe('ReportsPdfController', () => {
  const exportBracketsReportPdfUseCase = {
    execute: vi.fn(),
  } as unknown as ExportBracketsReportPdfUseCase;
  const exportFightsByAreaPdfUseCase = {
    execute: vi.fn(),
  } as unknown as ExportFightsByAreaPdfUseCase;

  const controller = new ReportsPdfController(
    exportBracketsReportPdfUseCase,
    exportFightsByAreaPdfUseCase,
  );

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return fights-by-area pdf stream with proper headers', async () => {
    vi.mocked(exportFightsByAreaPdfUseCase.execute).mockResolvedValue({
      buffer: Buffer.from('pdf'),
      fileName: 'copa-central-fights-by-area.pdf',
    });

    const result = await controller.exportFightsByArea({ id: 1 });

    expect(result).toBeInstanceOf(StreamableFile);
    expect(result.getHeaders()).toMatchObject({
      type: 'application/pdf',
      disposition: 'inline; filename="copa-central-fights-by-area.pdf"',
    });
  });
});
