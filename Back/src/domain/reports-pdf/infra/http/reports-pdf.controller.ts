import { Controller, Get, Param, Query, StreamableFile } from '@nestjs/common';
import { ZodValidationPipe } from '@/core/pipe/zod-validation.pipe';
import {
  CompetitionIdParamDto,
  CompetitionIdParamSchema,
} from '@/domain/competition/infra/http/dtos/competition-id-param.dto';
import { ExportBracketsReportPdfUseCase } from '../../application/use-cases/export-brackets-report-pdf.use-case';
import {
  ExportBracketsReportQueryDto,
  ExportBracketsReportQuerySchema,
} from './dtos/export-brackets-report.query.dto';
import { ExportFightsByAreaPdfUseCase } from '../../application/use-cases/export-fights-by-area-pdf.use-case';

@Controller()
export class ReportsPdfController {
  constructor(
    private readonly exportBracketsReportPdfUseCase: ExportBracketsReportPdfUseCase,
    private readonly exportFightsByAreaPdfUseCase: ExportFightsByAreaPdfUseCase,
  ) {}

  @Get('competitions/:id/reports/pdf/brackets')
  async exportBrackets(
    @Param(new ZodValidationPipe(CompetitionIdParamSchema))
    params: CompetitionIdParamDto,
    @Query(new ZodValidationPipe(ExportBracketsReportQuerySchema))
    query: ExportBracketsReportQueryDto,
  ) {
    const pdf = await this.exportBracketsReportPdfUseCase.execute({
      competitionId: params.id,
      includeResults: query.includeResults,
      categoryId: query.categoryId,
      areaId: query.areaId,
    });

    return new StreamableFile(pdf.buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${pdf.fileName}"`,
    });
  }

  @Get('competitions/:id/reports/pdf/fights-by-area')
  async exportFightsByArea(
    @Param(new ZodValidationPipe(CompetitionIdParamSchema))
    params: CompetitionIdParamDto,
  ) {
    const pdf = await this.exportFightsByAreaPdfUseCase.execute(params.id);

    return new StreamableFile(pdf.buffer, {
      type: 'application/pdf',
      disposition: `inline; filename="${pdf.fileName}"`,
    });
  }
}
