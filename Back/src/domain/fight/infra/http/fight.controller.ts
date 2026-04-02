import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ZodValidationPipe } from '@/core/pipe/zod-validation.pipe';
import { ApiResponse } from '@/shared/result/api-response.type';
import { FinishFightUseCase } from '../../application/use-cases/finish-fight.use-case';
import { FightListItemView } from '../../application/use-cases/fight-list-item.view';
import { GenerateFightsUseCase } from '../../application/use-cases/generate-fights.use-case';
import { ListFightsUseCase } from '../../application/use-cases/list-fights.use-case';
import { StartFightUseCase } from '../../application/use-cases/start-fight.use-case';
import {
  CompetitionFightParamDto,
  CompetitionFightParamSchema,
} from './dtos/competition-fight-param.dto';
import { FightIdParamDto, FightIdParamSchema } from './dtos/fight-id-param.dto';
import { FinishFightDto, FinishFightSchema } from './dtos/finish-fight.dto';
import { ListFightsDto, ListFightsSchema } from './dtos/list-fights.dto';

@Controller()
export class FightController {
  constructor(
    private readonly generateFightsUseCase: GenerateFightsUseCase,
    private readonly startFightUseCase: StartFightUseCase,
    private readonly finishFightUseCase: FinishFightUseCase,
    private readonly listFightsUseCase: ListFightsUseCase,
  ) {}

  @Post('competitions/:id/fights/generate')
  async generate(
    @Param(new ZodValidationPipe(CompetitionFightParamSchema))
    params: CompetitionFightParamDto,
  ): Promise<ApiResponse<Awaited<ReturnType<GenerateFightsUseCase['execute']>>>> {
    const result = await this.generateFightsUseCase.execute(params.id);

    return {
      data: result,
      error: null,
    };
  }

  @Post('fights/:id/start')
  async start(
    @Param(new ZodValidationPipe(FightIdParamSchema))
    params: FightIdParamDto,
  ) {
    const fight = await this.startFightUseCase.execute(params.id);

    return {
      data: fight.toJSON(),
      error: null,
    };
  }

  @Post('fights/:id/finish')
  async finish(
    @Param(new ZodValidationPipe(FightIdParamSchema))
    params: FightIdParamDto,
    @Body(new ZodValidationPipe(FinishFightSchema))
    body: FinishFightDto,
  ) {
    const fight = await this.finishFightUseCase.execute({
      id: params.id,
      ...body,
    });

    return {
      data: fight.toJSON(),
      error: null,
    };
  }

  @Get('competitions/:id/fights')
  async list(
    @Param(new ZodValidationPipe(CompetitionFightParamSchema))
    params: CompetitionFightParamDto,
    @Query(new ZodValidationPipe(ListFightsSchema))
    query: ListFightsDto,
  ): Promise<ApiResponse<FightListItemView[]>> {
    const fights = await this.listFightsUseCase.execute({
      competitionId: params.id,
      status: query.status,
    });

    return {
      data: fights,
      error: null,
    };
  }
}
