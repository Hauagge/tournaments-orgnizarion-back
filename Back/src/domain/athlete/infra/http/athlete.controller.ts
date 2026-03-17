import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ZodValidationPipe } from 'src/core/pipe/zod-validation.pipe';
import { ApiResponse } from 'src/shared/result/api-response.type';
import { CreateAthleteUseCase } from '../../application/use-cases/create-athlete.use-case';
import { SearchAthletesUseCase } from '../../application/use-cases/search-athletes.use-case';
import { UpdateAthleteUseCase } from '../../application/use-cases/update-athlete.use-case';
import { Athlete } from '../../domain/entities/athlete.entity';
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
export class AthleteController {
  constructor(
    private readonly createAthleteUseCase: CreateAthleteUseCase,
    private readonly updateAthleteUseCase: UpdateAthleteUseCase,
    private readonly searchAthletesUseCase: SearchAthletesUseCase,
  ) {}

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
  ): Promise<ApiResponse<ReturnType<Athlete['toJSON']>[]>> {
    const athletes = await this.searchAthletesUseCase.execute({
      competitionId: params.id,
      query: query.query,
      teamId: query.teamId,
    });

    return {
      data: athletes.map((athlete) => athlete.toJSON()),
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
