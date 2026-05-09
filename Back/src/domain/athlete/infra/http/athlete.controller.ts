import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Public } from '@/core/auth/infra/decorators/public.decorator';
import { Roles } from '@/core/auth/infra/decorators/roles.decorator';
import { JwtAuthGuard } from '@/core/auth/infra/guards/jwt-auth.guard';
import { RolesGuard } from '@/core/auth/infra/guards/roles.guard';
import { AuthRole } from '@/domain/auth/auth-role.enum';
import { ZodValidationPipe } from 'src/core/pipe/zod-validation.pipe';
import { ApiResponse } from 'src/shared/result/api-response.type';
import { AthleteListItemView } from '../../application/use-cases/athlete-list-item.view';
import { CreateAthleteUseCase } from '../../application/use-cases/create-athlete.use-case';
import { SearchAthletesUseCase } from '../../application/use-cases/search-athletes.use-case';
import { UpdateAthleteUseCase } from '../../application/use-cases/update-athlete.use-case';
import { Athlete } from '../../domain/entities/athlete.entity';
import { BELTS } from '../../domain/value-objects/belts.constant';
import {
  AthleteIdParamDto,
  AthleteIdParamSchema,
} from './dtos/athlete-id-param.dto';
import {
  CompetitionAthleteParamDto,
  CompetitionAthleteParamSchema,
} from './dtos/competition-athlete-param.dto';
import {
  CreateAthleteDto,
  CreateAthleteSchema,
} from './dtos/create-athlete.dto';
import {
  SearchAthletesDto,
  SearchAthletesSchema,
} from './dtos/search-athletes.dto';
import {
  UpdateAthleteDto,
  UpdateAthleteSchema,
} from './dtos/update-athlete.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AuthRole.STAFF, AuthRole.DESK, AuthRole.ORGANIZATION)
export class AthleteController {
  constructor(
    private readonly createAthleteUseCase: CreateAthleteUseCase,
    private readonly updateAthleteUseCase: UpdateAthleteUseCase,
    private readonly searchAthletesUseCase: SearchAthletesUseCase,
  ) {}

  @Get('belts')
  @Public()
  async listBelts(): Promise<ApiResponse<(typeof BELTS)[number][]>> {
    return {
      data: [...BELTS],
      error: null,
    };
  }

  @Post('competitions/:id/athletes')
  async create(
    @Param(new ZodValidationPipe(CompetitionAthleteParamSchema))
    params: CompetitionAthleteParamDto,
    @Body(new ZodValidationPipe(CreateAthleteSchema))
    body: CreateAthleteDto,
  ): Promise<ApiResponse<ReturnType<Athlete['toJSON']>>> {
    const athlete = await this.createAthleteUseCase.execute({
      competitionId: params.id,
      ...body,
    });

    return {
      data: athlete.toJSON(),
      error: null,
    };
  }

  @Get('competitions/:id/athletes')
  async search(
    @Param(new ZodValidationPipe(CompetitionAthleteParamSchema))
    params: CompetitionAthleteParamDto,
    @Query(new ZodValidationPipe(SearchAthletesSchema))
    query: SearchAthletesDto,
  ): Promise<ApiResponse<AthleteListItemView[]>> {
    const athletes = await this.searchAthletesUseCase.execute({
      competitionId: params.id,
      query: query.query,
      academyId: query.academyId,
    });

    return {
      data: athletes,
      error: null,
    };
  }

  @Patch('athletes/:id')
  async update(
    @Param(new ZodValidationPipe(AthleteIdParamSchema))
    params: AthleteIdParamDto,
    @Body(new ZodValidationPipe(UpdateAthleteSchema))
    body: UpdateAthleteDto,
  ): Promise<ApiResponse<ReturnType<Athlete['toJSON']>>> {
    const athlete = await this.updateAthleteUseCase.execute({
      id: params.id,
      ...body,
    });

    return {
      data: athlete.toJSON(),
      error: null,
    };
  }
}
