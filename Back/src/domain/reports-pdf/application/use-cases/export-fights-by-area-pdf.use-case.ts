import { Injectable } from '@nestjs/common';
import { FightsByAreaReportDataBuilderService } from '../services/fights-by-area-report-data-builder.service';
import { PdfRendererService } from '../services/pdf-renderer.service';
import { TemplateRendererService } from '../services/template-renderer.service';

@Injectable()
export class ExportFightsByAreaPdfUseCase {
  constructor(
    private readonly fightsByAreaReportDataBuilderService: FightsByAreaReportDataBuilderService,
    private readonly templateRendererService: TemplateRendererService,
    private readonly pdfRendererService: PdfRendererService,
  ) {}

  async execute(competitionId: number): Promise<{
    buffer: Buffer;
    fileName: string;
  }> {
    const report =
      await this.fightsByAreaReportDataBuilderService.build(competitionId);
    const html = await this.templateRendererService.render(
      'fights-by-area-report.hbs',
      {
        ...report,
        hasAreas: report.sections.length > 0,
      },
    );
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

    return `${slug || 'competition'}-fights-by-area.pdf`;
  }
}
