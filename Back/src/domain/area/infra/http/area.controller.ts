import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Roles } from '@/core/auth/infra/decorators/roles.decorator';
import { CompetitionAccess } from '@/core/auth/infra/decorators/competition-access.decorator';
import { CompetitionAccessGuard } from '@/core/auth/infra/guards/competition-access.guard';
import { JwtAuthGuard } from '@/core/auth/infra/guards/jwt-auth.guard';
import { RolesGuard } from '@/core/auth/infra/guards/roles.guard';
import { AuthRole } from '@/domain/auth/auth-role.enum';
import { ZodValidationPipe } from '@/core/pipe/zod-validation.pipe';
import { ApiResponse } from '@/shared/result/api-response.type';
import { CallNextAreaFightUseCase } from '../../application/use-cases/call-next-area-fight.use-case';
import { CreateAreasUseCase } from '../../application/use-cases/create-areas.use-case';
import { DistributeAreaFightsUseCase } from '../../application/use-cases/distribute-area-fights.use-case';
import { GetAreaQueueUseCase } from '../../application/use-cases/get-area-queue.use-case';
import { ListAreasByCompetitionUseCase } from '../../application/use-cases/list-areas-by-competition.use-case';
import { MoveKeyGroupAreaDistributionUseCase } from '../../application/use-cases/move-key-group-area-distribution.use-case';
import { Area } from '../../domain/entities/area.entity';
import { AreaIdParamDto, AreaIdParamSchema } from './dtos/area-id-param.dto';
import {
  CompetitionAreaParamDto,
  CompetitionAreaParamSchema,
} from './dtos/competition-area-param.dto';
import { CreateAreasDto, CreateAreasSchema } from './dtos/create-areas.dto';
import {
  DistributeAreaFightsDto,
  DistributeAreaFightsSchema,
} from './dtos/distribute-area-fights.dto';
import {
  MoveKeyGroupAreaDistributionDto,
  MoveKeyGroupAreaDistributionSchema,
} from './dtos/move-key-group-area-distribution.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard, CompetitionAccessGuard)
@Roles(AuthRole.STAFF, AuthRole.DESK, AuthRole.ORGANIZATION)
export class AreaController {
  constructor(
    private readonly createAreasUseCase: CreateAreasUseCase,
    private readonly listAreasByCompetitionUseCase: ListAreasByCompetitionUseCase,
    private readonly distributeAreaFightsUseCase: DistributeAreaFightsUseCase,
    private readonly getAreaQueueUseCase: GetAreaQueueUseCase,
    private readonly callNextAreaFightUseCase: CallNextAreaFightUseCase,
    private readonly moveKeyGroupAreaDistributionUseCase: MoveKeyGroupAreaDistributionUseCase,
  ) {}

  @Post('competitions/:id/areas')
  @CompetitionAccess({ type: 'competition', param: 'id' })
  async create(
    @Param(new ZodValidationPipe(CompetitionAreaParamSchema))
    params: CompetitionAreaParamDto,
    @Body(new ZodValidationPipe(CreateAreasSchema))
    body: CreateAreasDto,
  ): Promise<ApiResponse<ReturnType<Area['toJSON']>[]>> {
    const areas = await this.createAreasUseCase.execute({
      competitionId: params.id,
      count: body.count,
      names: body.names,
    });

    return {
      data: areas.map((area) => area.toJSON()),
      error: null,
    };
  }

  @Get('competitions/:id/areas')
  @CompetitionAccess({ type: 'competition', param: 'id' })
  async list(
    @Param(new ZodValidationPipe(CompetitionAreaParamSchema))
    params: CompetitionAreaParamDto,
  ) {
    const areas = await this.listAreasByCompetitionUseCase.execute(params.id);

    return {
      data: areas,
      error: null,
    };
  }

  @Post('competitions/:id/areas/distribute')
  @CompetitionAccess({ type: 'competition', param: 'id' })
  async distribute(
    @Param(new ZodValidationPipe(CompetitionAreaParamSchema))
    params: CompetitionAreaParamDto,
    @Body(new ZodValidationPipe(DistributeAreaFightsSchema))
    body: DistributeAreaFightsDto,
  ) {
    const result = await this.distributeAreaFightsUseCase.execute({
      competitionId: params.id,
      mode: body.mode,
      ageSplitYears: body.ageSplitYears,
      restGapFights: body.restGapFights,
      fightIds: body.fightIds,
    });

    return {
      data: result,
      error: null,
    };
  }

  @Get('areas/:id/queue')
  @CompetitionAccess({ type: 'area', param: 'id' })
  async queue(
    @Param(new ZodValidationPipe(AreaIdParamSchema))
    params: AreaIdParamDto,
  ) {
    const queue = await this.getAreaQueueUseCase.execute(params.id);

    return {
      data: queue,
      error: null,
    };
  }

  @Patch('competitions/:id/areas/distribution')
  @CompetitionAccess({ type: 'competition', param: 'id' })
  async moveDistribution(
    @Param(new ZodValidationPipe(CompetitionAreaParamSchema))
    params: CompetitionAreaParamDto,
    @Body(new ZodValidationPipe(MoveKeyGroupAreaDistributionSchema))
    body: MoveKeyGroupAreaDistributionDto,
  ) {
    const result = await this.moveKeyGroupAreaDistributionUseCase.execute({
      competitionId: params.id,
      keyGroupId: body.keyGroupId,
      fromAreaId: body.fromAreaId,
      toAreaId: body.toAreaId,
      orderIndex: body.orderIndex,
    });

    return {
      data: result,
      error: null,
    };
  }

  @Post('areas/:id/call-next')
  @CompetitionAccess({ type: 'area', param: 'id' })
  async callNext(
    @Param(new ZodValidationPipe(AreaIdParamSchema))
    params: AreaIdParamDto,
  ) {
    const fight = await this.callNextAreaFightUseCase.execute(params.id);

    return {
      data: fight.toJSON(),
      error: null,
    };
  }
}
