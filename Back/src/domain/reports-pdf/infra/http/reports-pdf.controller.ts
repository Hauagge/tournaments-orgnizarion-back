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

@Controller()
export class ReportsPdfController {
  constructor(
    private readonly exportBracketsReportPdfUseCase: ExportBracketsReportPdfUseCase,
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
}
