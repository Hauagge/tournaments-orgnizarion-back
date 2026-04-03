import { Module } from '@nestjs/common';
import { CompetitionProviderModule } from '../competition/competition-provider.module';
import { KeyGroupProviderModule } from '../key-group/key-group-provider.module';
import { ReportDataBuilderService } from './application/services/report-data-builder.service';
import { PdfRendererService } from './application/services/pdf-renderer.service';
import { TemplateRendererService } from './application/services/template-renderer.service';
import { ExportBracketsReportPdfUseCase } from './application/use-cases/export-brackets-report-pdf.use-case';
import { ReportsPdfController } from './infra/http/reports-pdf.controller';

@Module({
  imports: [CompetitionProviderModule, KeyGroupProviderModule],
  controllers: [ReportsPdfController],
  providers: [
    ReportDataBuilderService,
    TemplateRendererService,
    PdfRendererService,
    ExportBracketsReportPdfUseCase,
  ],
})
export class ReportsPdfModule {}
