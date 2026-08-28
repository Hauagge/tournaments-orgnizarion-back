import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
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
import { ZodValidationPipe } from '@/core/pipe/zod-validation.pipe';
import { ApiResponse } from '@/shared/result/api-response.type';
import { ChampionAcademiesReportUseCase } from '../../application/use-cases/champion-academies-report.use-case';
import { ChampionAcademiesReportView } from '../../application/use-cases/champion-academies-report.view';
import {
  ChampionAcademiesReportQueryDto,
  ChampionAcademiesReportQuerySchema,
} from './dtos/champion-academies-report.query.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard, CompetitionAccessGuard)
@Roles(AuthRole.STAFF, AuthRole.DESK, AuthRole.ORGANIZATION)
export class ReportsController {
  constructor(
    private readonly championAcademiesReportUseCase: ChampionAcademiesReportUseCase,
  ) {}

  @Get('competitions/:id/reports/champion-academies')
  @CompetitionAccess({ type: 'competition', param: 'id' })
  async championAcademies(
    @Param(new ZodValidationPipe(CompetitionIdParamSchema))
    params: CompetitionIdParamDto,
    @Query(new ZodValidationPipe(ChampionAcademiesReportQuerySchema))
    query: ChampionAcademiesReportQueryDto,
  ): Promise<ApiResponse<ChampionAcademiesReportView>> {
    const report = await this.championAcademiesReportUseCase.execute({
      competitionId: params.id,
      belt: query.belt,
      ageDivision: query.ageDivision,
      categoryId: query.categoryId,
    });

    return {
      data: report,
      error: null,
    };
  }
}
