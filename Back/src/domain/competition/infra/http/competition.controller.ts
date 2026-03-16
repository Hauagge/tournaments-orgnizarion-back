import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ZodValidationPipe } from 'src/core/pipe/zod-validation.pipe';
import { ApiResponse } from 'src/shared/result/api-response.type';
import { CreateCompetitionUseCase } from '../../application/use-cases/create-competition.use-case';
import { GetCompetitionUseCase } from '../../application/use-cases/get-competition.use-case';
import { ListCompetitionsUseCase } from '../../application/use-cases/list-competitions.use-case';
import { UpdateCompetitionSettingsUseCase } from '../../application/use-cases/update-competition-settings.use-case';
import { Competition } from '../../domain/entities/competition.entity';
import {
  CompetitionIdParamDto,
  CompetitionIdParamSchema,
} from './dtos/competition-id-param.dto';
import {
  CreateCompetitionDto,
  CreateCompetitionSchema,
} from './dtos/create-competition.dto';
import {
  UpdateCompetitionSettingsDto,
  UpdateCompetitionSettingsSchema,
} from './dtos/update-competition-settings.dto';
import {
  ListCompetitionsDto,
  ListCompetitionsSchema,
} from './dtos/list-competitions.dto';

@Controller('competitions')
export class CompetitionController {
  constructor(
    private readonly createCompetitionUseCase: CreateCompetitionUseCase,
    private readonly updateCompetitionSettingsUseCase: UpdateCompetitionSettingsUseCase,
    private readonly getCompetitionUseCase: GetCompetitionUseCase,
    private readonly listCompetitionsUseCase: ListCompetitionsUseCase,
  ) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(ListCompetitionsSchema))
    query: ListCompetitionsDto,
  ): Promise<
    ApiResponse<{
      items: ReturnType<Competition['toJSON']>[];
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    }>
  > {
    const result = await this.listCompetitionsUseCase.execute(query);

    return {
      data: {
        items: result.items.map((competition) => competition.toJSON()),
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      },
      error: null,
    };
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateCompetitionSchema))
    body: CreateCompetitionDto,
  ): Promise<ApiResponse<ReturnType<Competition['toJSON']>>> {
    const competition = await this.createCompetitionUseCase.execute(body);
    return {
      data: competition.toJSON(),
      error: null,
    };
  }

  @Patch(':id')
  async update(
    @Param(new ZodValidationPipe(CompetitionIdParamSchema))
    params: CompetitionIdParamDto,
    @Body(new ZodValidationPipe(UpdateCompetitionSettingsSchema))
    body: UpdateCompetitionSettingsDto,
  ): Promise<ApiResponse<ReturnType<Competition['toJSON']>>> {
    const competition = await this.updateCompetitionSettingsUseCase.execute({
      id: params.id,
      ...body,
    });

    return {
      data: competition.toJSON(),
      error: null,
    };
  }

  @Get(':id')
  async getById(
    @Param(new ZodValidationPipe(CompetitionIdParamSchema))
    params: CompetitionIdParamDto,
  ): Promise<ApiResponse<ReturnType<Competition['toJSON']>>> {
    const competition = await this.getCompetitionUseCase.execute(params.id);

    return {
      data: competition.toJSON(),
      error: null,
    };
  }
}
