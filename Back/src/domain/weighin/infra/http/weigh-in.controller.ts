import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CompetitionAccess } from '@/core/auth/infra/decorators/competition-access.decorator';
import { CurrentUser } from '@/core/auth/infra/decorators/current-user.decorator';
import { Roles } from '@/core/auth/infra/decorators/roles.decorator';
import { CompetitionAccessGuard } from '@/core/auth/infra/guards/competition-access.guard';
import { JwtAuthGuard } from '@/core/auth/infra/guards/jwt-auth.guard';
import { RolesGuard } from '@/core/auth/infra/guards/roles.guard';
import { AuthenticatedUser } from '@/core/auth/infra/types/authenticated-user.type';
import { AuthRole } from '@/domain/auth/auth-role.enum';
import {
  CompetitionIdParamDto,
  CompetitionIdParamSchema,
} from '@/domain/competition/infra/http/dtos/competition-id-param.dto';
import { ZodValidationPipe } from 'src/core/pipe/zod-validation.pipe';
import { ApiResponse } from 'src/shared/result/api-response.type';
import { ConfirmWeighInUseCase } from '../../application/use-cases/confirm-weigh-in.use-case';
import { GetWeighInStatusUseCase } from '../../application/use-cases/get-weigh-in-status.use-case';
import { ResetWeighInUseCase } from '../../application/use-cases/reset-weigh-in.use-case';
import { SearchWeighInByAthleteNameUseCase } from '../../application/use-cases/search-weigh-in-by-athlete-name.use-case';
import { WeighInStatusView } from '../../application/use-cases/weigh-in-status.view';
import { WeighIn } from '../../domain/entities/weigh-in.entity';
import {
  ConfirmWeighInDto,
  ConfirmWeighInSchema,
} from './dtos/confirm-weigh-in.dto';
import { ResetWeighInDto, ResetWeighInSchema } from './dtos/reset-weigh-in.dto';
import {
  SearchWeighInDto,
  SearchWeighInSchema,
} from './dtos/search-weigh-in.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard, CompetitionAccessGuard)
@Roles(AuthRole.STAFF, AuthRole.DESK, AuthRole.ORGANIZATION)
export class WeighInController {
  constructor(
    private readonly confirmWeighInUseCase: ConfirmWeighInUseCase,
    private readonly resetWeighInUseCase: ResetWeighInUseCase,
    private readonly getWeighInStatusUseCase: GetWeighInStatusUseCase,
    private readonly searchWeighInByAthleteNameUseCase: SearchWeighInByAthleteNameUseCase,
  ) {}

  @Post('competitions/:id/weighin/confirm')
  @CompetitionAccess({ type: 'competition', param: 'id' })
  async confirm(
    @Param(new ZodValidationPipe(CompetitionIdParamSchema))
    params: CompetitionIdParamDto,
    @Body(new ZodValidationPipe(ConfirmWeighInSchema))
    body: ConfirmWeighInDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<ApiResponse<ReturnType<WeighIn['toJSON']>>> {
    const weighIn = await this.confirmWeighInUseCase.execute({
      competitionId: params.id,
      athleteId: body.athleteId,
      measuredWeightGrams: body.realWeightGrams,
      weighInStatus: body.weighInStatus,
      performedById: currentUser.sub,
      performedBy: currentUser.username,
      observation: body.observation,
    });

    return {
      data: weighIn.toJSON(),
      error: null,
    };
  }

  @Post('competitions/:id/weighin/reset')
  @CompetitionAccess({ type: 'competition', param: 'id' })
  async reset(
    @Param(new ZodValidationPipe(CompetitionIdParamSchema))
    params: CompetitionIdParamDto,
    @Body(new ZodValidationPipe(ResetWeighInSchema))
    body: ResetWeighInDto,
  ): Promise<ApiResponse<ReturnType<WeighIn['toJSON']>>> {
    const weighIn = await this.resetWeighInUseCase.execute({
      competitionId: params.id,
      athleteId: body.athleteId,
    });

    return {
      data: weighIn.toJSON(),
      error: null,
    };
  }

  @Get('competitions/:id/weighin')
  @CompetitionAccess({ type: 'competition', param: 'id' })
  async search(
    @Param(new ZodValidationPipe(CompetitionIdParamSchema))
    params: CompetitionIdParamDto,
    @Query(new ZodValidationPipe(SearchWeighInSchema))
    query: SearchWeighInDto,
  ): Promise<ApiResponse<WeighInStatusView[]>> {
    const data = query.athleteId
      ? [
          await this.getWeighInStatusUseCase.execute({
            competitionId: params.id,
            athleteId: query.athleteId,
          }),
        ]
      : await this.searchWeighInByAthleteNameUseCase.execute({
          competitionId: params.id,
          query: query.query,
        });

    return {
      data,
      error: null,
    };
  }
}
