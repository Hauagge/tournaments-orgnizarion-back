import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ZodValidationPipe } from '@/core/pipe/zod-validation.pipe';
import { ApiResponse } from '@/shared/result/api-response.type';
import { CallNextAreaFightUseCase } from '../../application/use-cases/call-next-area-fight.use-case';
import { CreateAreasUseCase } from '../../application/use-cases/create-areas.use-case';
import { DistributeAreaFightsUseCase } from '../../application/use-cases/distribute-area-fights.use-case';
import { GetAreaQueueUseCase } from '../../application/use-cases/get-area-queue.use-case';
import { ListAreasByCompetitionUseCase } from '../../application/use-cases/list-areas-by-competition.use-case';
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

@Controller()
export class AreaController {
  constructor(
    private readonly createAreasUseCase: CreateAreasUseCase,
    private readonly listAreasByCompetitionUseCase: ListAreasByCompetitionUseCase,
    private readonly distributeAreaFightsUseCase: DistributeAreaFightsUseCase,
    private readonly getAreaQueueUseCase: GetAreaQueueUseCase,
    private readonly callNextAreaFightUseCase: CallNextAreaFightUseCase,
  ) {}

  @Post('competitions/:id/areas')
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
  async distribute(
    @Param(new ZodValidationPipe(CompetitionAreaParamSchema))
    params: CompetitionAreaParamDto,
    @Body(new ZodValidationPipe(DistributeAreaFightsSchema))
    body: DistributeAreaFightsDto,
  ) {
    const result = await this.distributeAreaFightsUseCase.execute({
      competitionId: params.id,
      ageSplitYears: body.ageSplitYears,
      restGapFights: body.restGapFights,
    });

    return {
      data: result,
      error: null,
    };
  }

  @Get('areas/:id/queue')
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

  @Post('areas/:id/call-next')
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
