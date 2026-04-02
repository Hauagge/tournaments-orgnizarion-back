import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Athlete } from '@/domain/athlete/domain/entities/athlete.entity';
import { ZodValidationPipe } from 'src/core/pipe/zod-validation.pipe';
import { ApiResponse } from 'src/shared/result/api-response.type';
import { LinkAthleteToAcademyUseCase } from '../../application/use-cases/link-athlete-to-academy.use-case';
import { CreateAcademyUseCase } from '../../application/use-cases/create-academy.use-case';
import { ListAcademiesByCompetitionUseCase } from '../../application/use-cases/list-academies-by-competition.use-case';
import { UnlinkAthleteFromAcademyUseCase } from '../../application/use-cases/unlink-athlete-from-academy.use-case';
import { UpdateAcademyUseCase } from '../../application/use-cases/update-academy.use-case';
import { Academy } from '../../domain/entities/academy.entity';
import {
  CompetitionAcademyParamDto,
  CompetitionAcademyParamSchema,
} from './dtos/competition-academy-param.dto';
import { CreateAcademyDto, CreateAcademySchema } from './dtos/create-academy.dto';
import {
  AcademyAthleteParamDto,
  AcademyAthleteParamSchema,
} from './dtos/academy-athlete-param.dto';
import { AcademyIdParamDto, AcademyIdParamSchema } from './dtos/academy-id-param.dto';
import { UpdateAcademyDto, UpdateAcademySchema } from './dtos/update-academy.dto';

@Controller()
export class AcademyController {
  constructor(
    private readonly createAcademyUseCase: CreateAcademyUseCase,
    private readonly updateAcademyUseCase: UpdateAcademyUseCase,
    private readonly listAcademiesByCompetitionUseCase: ListAcademiesByCompetitionUseCase,
    private readonly linkAthleteToAcademyUseCase: LinkAthleteToAcademyUseCase,
    private readonly unlinkAthleteFromAcademyUseCase: UnlinkAthleteFromAcademyUseCase,
  ) {}

  @Post('competitions/:id/academies')
  async create(
    @Param(new ZodValidationPipe(CompetitionAcademyParamSchema))
    params: CompetitionAcademyParamDto,
    @Body(new ZodValidationPipe(CreateAcademySchema))
    body: CreateAcademyDto,
  ): Promise<ApiResponse<ReturnType<Academy['toJSON']>>> {
    const academy = await this.createAcademyUseCase.execute({
      competitionId: params.id,
      ...body,
    });

    return {
      data: academy.toJSON(),
      error: null,
    };
  }

  @Get('competitions/:id/academies')
  async listByCompetition(
    @Param(new ZodValidationPipe(CompetitionAcademyParamSchema))
    params: CompetitionAcademyParamDto,
  ): Promise<ApiResponse<ReturnType<Academy['toJSON']>[]>> {
    const academies = await this.listAcademiesByCompetitionUseCase.execute({
      competitionId: params.id,
    });

    return {
      data: academies.map((academy) => academy.toJSON()),
      error: null,
    };
  }

  @Patch('academies/:id')
  async update(
    @Param(new ZodValidationPipe(AcademyIdParamSchema))
    params: AcademyIdParamDto,
    @Body(new ZodValidationPipe(UpdateAcademySchema))
    body: UpdateAcademyDto,
  ): Promise<ApiResponse<ReturnType<Academy['toJSON']>>> {
    const academy = await this.updateAcademyUseCase.execute({
      id: params.id,
      ...body,
    });

    return {
      data: academy.toJSON(),
      error: null,
    };
  }

  @Post('academies/:id/athletes/:athleteId')
  async linkAthlete(
    @Param(new ZodValidationPipe(AcademyAthleteParamSchema))
    params: AcademyAthleteParamDto,
  ): Promise<ApiResponse<ReturnType<Athlete['toJSON']>>> {
    const athlete = await this.linkAthleteToAcademyUseCase.execute({
      academyId: params.id,
      athleteId: params.athleteId,
    });

    return {
      data: athlete.toJSON(),
      error: null,
    };
  }

  @Delete('academies/:id/athletes/:athleteId')
  async unlinkAthlete(
    @Param(new ZodValidationPipe(AcademyAthleteParamSchema))
    params: AcademyAthleteParamDto,
  ): Promise<ApiResponse<ReturnType<Athlete['toJSON']>>> {
    const athlete = await this.unlinkAthleteFromAcademyUseCase.execute({
      academyId: params.id,
      athleteId: params.athleteId,
    });

    return {
      data: athlete.toJSON(),
      error: null,
    };
  }
}
