import { Injectable } from '@nestjs/common';
import { ReportDataBuilderService } from '../services/report-data-builder.service';
import { PdfRendererService } from '../services/pdf-renderer.service';
import { TemplateRendererService } from '../services/template-renderer.service';

type ExportBracketsReportInput = {
  competitionId: number;
  includeResults: boolean;
  categoryId?: number;
  areaId?: number;
};

@Injectable()
export class ExportBracketsReportPdfUseCase {
  constructor(
    private readonly reportDataBuilderService: ReportDataBuilderService,
    private readonly templateRendererService: TemplateRendererService,
    private readonly pdfRendererService: PdfRendererService,
  ) {}

  async execute(input: ExportBracketsReportInput): Promise<{
    buffer: Buffer;
    fileName: string;
  }> {
    const report = await this.reportDataBuilderService.build(input);
    const html = await this.templateRendererService.render('brackets-report.hbs', {
      ...report,
      hasBrackets: report.brackets.length > 0,
    });
    const buffer = await this.pdfRendererService.renderFromHtml(html);

    return {
      buffer,
      fileName: this.buildFileName(report.competitionName),
    };
  }

  private buildFileName(competitionName: string): string {
    const slug = competitionName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);

    return `${slug || 'competition'}-brackets-report.pdf`;
  }
}
