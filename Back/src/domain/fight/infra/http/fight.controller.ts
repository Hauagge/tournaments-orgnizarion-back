import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '@/core/auth/infra/decorators/roles.decorator';
import { CurrentUser } from '@/core/auth/infra/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/core/auth/infra/guards/jwt-auth.guard';
import { RolesGuard } from '@/core/auth/infra/guards/roles.guard';
import { AuthenticatedUser } from '@/core/auth/infra/types/authenticated-user.type';
import { AuthRole } from '@/domain/auth/auth-role.enum';
import { ZodValidationPipe } from '@/core/pipe/zod-validation.pipe';
import { ApiResponse } from '@/shared/result/api-response.type';
import { FinishFightUseCase } from '../../application/use-cases/finish-fight.use-case';
import { FightListItemView } from '../../application/use-cases/fight-list-item.view';
import { GenerateFightsUseCase } from '../../application/use-cases/generate-fights.use-case';
import { ListFightsUseCase } from '../../application/use-cases/list-fights.use-case';
import { CreateManualFightUseCase } from '../../application/use-cases/create-manual-fight.use-case';
import { DeleteFightUseCase } from '../../application/use-cases/delete-fight.use-case';
import { MarkFightWinnerUseCase } from '../../application/use-cases/mark-fight-winner.use-case';
import { StartFightUseCase } from '../../application/use-cases/start-fight.use-case';
import { UpdateFightUseCase } from '../../application/use-cases/update-fight.use-case';
import { UpdateFightOrderUseCase } from '../../application/use-cases/update-fight-order.use-case';
import {
  CompetitionCategoryFightParamDto,
  CompetitionCategoryFightParamSchema,
} from './dtos/competition-category-fight-param.dto';
import {
  CompetitionFightParamDto,
  CompetitionFightParamSchema,
} from './dtos/competition-fight-param.dto';
import {
  CompetitionFightIdParamDto,
  CompetitionFightIdParamSchema,
} from './dtos/competition-fight-id-param.dto';
import {
  CreateManualFightDto,
  CreateManualFightSchema,
} from './dtos/create-manual-fight.dto';
import { FightIdParamDto, FightIdParamSchema } from './dtos/fight-id-param.dto';
import { FinishFightDto, FinishFightSchema } from './dtos/finish-fight.dto';
import { ListFightsDto, ListFightsSchema } from './dtos/list-fights.dto';
import {
  MarkFightWinnerDto,
  MarkFightWinnerSchema,
} from './dtos/mark-fight-winner.dto';
import { UpdateFightDto, UpdateFightSchema } from './dtos/update-fight.dto';
import {
  UpdateFightOrderDto,
  UpdateFightOrderSchema,
} from './dtos/update-fight-order.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AuthRole.STAFF, AuthRole.DESK, AuthRole.ORGANIZATION)
export class FightController {
  constructor(
    private readonly generateFightsUseCase: GenerateFightsUseCase,
    private readonly startFightUseCase: StartFightUseCase,
    private readonly finishFightUseCase: FinishFightUseCase,
    private readonly listFightsUseCase: ListFightsUseCase,
    private readonly updateFightOrderUseCase: UpdateFightOrderUseCase,
    private readonly createManualFightUseCase: CreateManualFightUseCase,
    private readonly markFightWinnerUseCase: MarkFightWinnerUseCase,
    private readonly updateFightUseCase: UpdateFightUseCase,
    private readonly deleteFightUseCase: DeleteFightUseCase,
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
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param(new ZodValidationPipe(CompetitionFightParamSchema))
    params: CompetitionFightParamDto,
    @Query(new ZodValidationPipe(ListFightsSchema))
    query: ListFightsDto,
  ): Promise<ApiResponse<FightListItemView[]>> {
    const fights = await this.listFightsUseCase.execute({
      currentUserId: currentUser.sub,
      competitionId: params.id,
      status: query.status,
      categoryId: query.categoryId,
      round: query.round,
      areaId: query.areaId,
      athleteName: query.athleteName,
    });

    return {
      data: fights,
      error: null,
    };
  }

  @Get('competitions/:competitionId/categories/:categoryId/fights')
  async listByCategory(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param(new ZodValidationPipe(CompetitionCategoryFightParamSchema))
    params: CompetitionCategoryFightParamDto,
  ): Promise<ApiResponse<FightListItemView[]>> {
    const fights = await this.listFightsUseCase.execute({
      currentUserId: currentUser.sub,
      competitionId: params.competitionId,
      categoryId: params.categoryId,
    });

    return {
      data: fights,
      error: null,
    };
  }

  @Post('competitions/:id/fights/manual')
  async createManual(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param(new ZodValidationPipe(CompetitionFightParamSchema))
    params: CompetitionFightParamDto,
    @Body(new ZodValidationPipe(CreateManualFightSchema))
    body: CreateManualFightDto,
  ) {
    const fight = await this.createManualFightUseCase.execute({
      currentUserId: currentUser.sub,
      competitionId: params.id,
      ...body,
    });

    return {
      data: fight.toJSON(),
      error: null,
    };
  }

  @Patch('competitions/:competitionId/fights/:fightId/winner')
  async markWinner(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param(new ZodValidationPipe(CompetitionFightIdParamSchema))
    params: CompetitionFightIdParamDto,
    @Body(new ZodValidationPipe(MarkFightWinnerSchema))
    body: MarkFightWinnerDto,
  ) {
    const result = await this.markFightWinnerUseCase.execute({
      currentUserId: currentUser.sub,
      competitionId: params.competitionId,
      fightId: params.fightId,
      winnerId: body.winnerId,
    });

    return {
      data: result,
      error: null,
    };
  }

  @Patch('competitions/:competitionId/fights/:fightId')
  async updateFight(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param(new ZodValidationPipe(CompetitionFightIdParamSchema))
    params: CompetitionFightIdParamDto,
    @Body(new ZodValidationPipe(UpdateFightSchema))
    body: UpdateFightDto,
  ) {
    const fight = await this.updateFightUseCase.execute({
      currentUserId: currentUser.sub,
      competitionId: params.competitionId,
      fightId: params.fightId,
      ...body,
    });

    return {
      data: fight.toJSON(),
      error: null,
    };
  }

  @Delete('competitions/:competitionId/fights/:fightId')
  async deleteFight(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param(new ZodValidationPipe(CompetitionFightIdParamSchema))
    params: CompetitionFightIdParamDto,
  ) {
    const result = await this.deleteFightUseCase.execute({
      currentUserId: currentUser.sub,
      competitionId: params.competitionId,
      fightId: params.fightId,
    });

    return {
      data: result,
      error: null,
    };
  }

  @Patch('competitions/:id/fights/order')
  async updateOrder(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param(new ZodValidationPipe(CompetitionFightParamSchema))
    params: CompetitionFightParamDto,
    @Body(new ZodValidationPipe(UpdateFightOrderSchema))
    body: UpdateFightOrderDto,
  ) {
    const result = await this.updateFightOrderUseCase.execute({
      currentUserId: currentUser.sub,
      competitionId: params.id,
      items: body.items,
    });

    return {
      data: result,
      error: null,
    };
  }
}
