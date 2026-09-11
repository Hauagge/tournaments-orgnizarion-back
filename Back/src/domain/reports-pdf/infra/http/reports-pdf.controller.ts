import {
  Controller,
  Get,
  Param,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ZodValidationPipe } from '@/core/pipe/zod-validation.pipe';
import { CompetitionAccess } from '@/core/auth/infra/decorators/competition-access.decorator';
import { Roles } from '@/core/auth/infra/decorators/roles.decorator';
import { CompetitionAccessGuard } from '@/core/auth/infra/guards/competition-access.guard';
import { JwtAuthGuard } from '@/core/auth/infra/guards/jwt-auth.guard';
import { RolesGuard } from '@/core/auth/infra/guards/roles.guard';
import { AuthRole } from '@/domain/auth/auth-role.enum';
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
@UseGuards(JwtAuthGuard, RolesGuard, CompetitionAccessGuard)
@Roles(AuthRole.STAFF, AuthRole.DESK, AuthRole.ORGANIZATION)
export class ReportsPdfController {
  constructor(
    private readonly exportBracketsReportPdfUseCase: ExportBracketsReportPdfUseCase,
    private readonly exportFightsByAreaPdfUseCase: ExportFightsByAreaPdfUseCase,
  ) {}

  @Get('competitions/:id/reports/pdf/brackets')
  @CompetitionAccess({ type: 'competition', param: 'id' })
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
  @CompetitionAccess({ type: 'competition', param: 'id' })
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
