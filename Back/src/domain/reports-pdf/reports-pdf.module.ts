import { Module } from '@nestjs/common';
import { AcademyProviderModule } from '../academy/academy-provider.module';
import { AreaProviderModule } from '../area/area-provider.module';
import { AthleteProviderModule } from '../athlete/athlete-provider.module';
import { CategoryProviderModule } from '../category/category-provider.module';
import { CompetitionProviderModule } from '../competition/competition-provider.module';
import { FightProviderModule } from '../fight/fight-provider.module';
import { KeyGroupProviderModule } from '../key-group/key-group-provider.module';
import { FightsByAreaReportDataBuilderService } from './application/services/fights-by-area-report-data-builder.service';
import { ReportDataBuilderService } from './application/services/report-data-builder.service';
import { PdfRendererService } from './application/services/pdf-renderer.service';
import { TemplateRendererService } from './application/services/template-renderer.service';
import { ExportBracketsReportPdfUseCase } from './application/use-cases/export-brackets-report-pdf.use-case';
import { ExportFightsByAreaPdfUseCase } from './application/use-cases/export-fights-by-area-pdf.use-case';
import { ReportsPdfController } from './infra/http/reports-pdf.controller';

@Module({
  imports: [
    CompetitionProviderModule,
    KeyGroupProviderModule,
    AreaProviderModule,
    FightProviderModule,
    AthleteProviderModule,
    AcademyProviderModule,
    CategoryProviderModule,
  ],
  controllers: [ReportsPdfController],
  providers: [
    ReportDataBuilderService,
    FightsByAreaReportDataBuilderService,
    TemplateRendererService,
    PdfRendererService,
    ExportBracketsReportPdfUseCase,
    ExportFightsByAreaPdfUseCase,
  ],
})
export class ReportsPdfModule {}
