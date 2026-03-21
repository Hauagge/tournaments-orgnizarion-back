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
import { AddAthleteToTeamUseCase } from '../../application/use-cases/add-athlete-to-team.use-case';
import { CreateTeamUseCase } from '../../application/use-cases/create-team.use-case';
import { ListTeamsByCompetitionUseCase } from '../../application/use-cases/list-teams-by-competition.use-case';
import { RemoveAthleteFromTeamUseCase } from '../../application/use-cases/remove-athlete-from-team.use-case';
import { UpdateTeamUseCase } from '../../application/use-cases/update-team.use-case';
import { Team } from '../../domain/entities/team.entity';
import {
  CompetitionTeamParamDto,
  CompetitionTeamParamSchema,
} from './dtos/competition-team-param.dto';
import { CreateTeamDto, CreateTeamSchema } from './dtos/create-team.dto';
import {
  TeamAthleteParamDto,
  TeamAthleteParamSchema,
} from './dtos/team-athlete-param.dto';
import { TeamIdParamDto, TeamIdParamSchema } from './dtos/team-id-param.dto';
import { UpdateTeamDto, UpdateTeamSchema } from './dtos/update-team.dto';

@Controller()
export class TeamController {
  constructor(
    private readonly createTeamUseCase: CreateTeamUseCase,
    private readonly updateTeamUseCase: UpdateTeamUseCase,
    private readonly listTeamsByCompetitionUseCase: ListTeamsByCompetitionUseCase,
    private readonly addAthleteToTeamUseCase: AddAthleteToTeamUseCase,
    private readonly removeAthleteFromTeamUseCase: RemoveAthleteFromTeamUseCase,
  ) {}

  @Post('competitions/:id/teams')
  async create(
    @Param(new ZodValidationPipe(CompetitionTeamParamSchema))
    params: CompetitionTeamParamDto,
    @Body(new ZodValidationPipe(CreateTeamSchema))
    body: CreateTeamDto,
  ): Promise<ApiResponse<ReturnType<Team['toJSON']>>> {
    const team = await this.createTeamUseCase.execute({
      competitionId: params.id,
      ...body,
    });

    return {
      data: team.toJSON(),
      error: null,
    };
  }

  @Get('competitions/:id/teams')
  async listByCompetition(
    @Param(new ZodValidationPipe(CompetitionTeamParamSchema))
    params: CompetitionTeamParamDto,
  ): Promise<ApiResponse<ReturnType<Team['toJSON']>[]>> {
    const teams = await this.listTeamsByCompetitionUseCase.execute({
      competitionId: params.id,
    });

    return {
      data: teams.map((team) => team.toJSON()),
      error: null,
    };
  }

  @Patch('teams/:id')
  async update(
    @Param(new ZodValidationPipe(TeamIdParamSchema))
    params: TeamIdParamDto,
    @Body(new ZodValidationPipe(UpdateTeamSchema))
    body: UpdateTeamDto,
  ): Promise<ApiResponse<ReturnType<Team['toJSON']>>> {
    const team = await this.updateTeamUseCase.execute({
      id: params.id,
      ...body,
    });

    return {
      data: team.toJSON(),
      error: null,
    };
  }

  @Post('teams/:id/athletes/:athleteId')
  async addAthlete(
    @Param(new ZodValidationPipe(TeamAthleteParamSchema))
    params: TeamAthleteParamDto,
  ): Promise<ApiResponse<ReturnType<Athlete['toJSON']>>> {
    const athlete = await this.addAthleteToTeamUseCase.execute({
      teamId: params.id,
      athleteId: params.athleteId,
    });

    return {
      data: athlete.toJSON(),
      error: null,
    };
  }

  @Delete('teams/:id/athletes/:athleteId')
  async removeAthlete(
    @Param(new ZodValidationPipe(TeamAthleteParamSchema))
    params: TeamAthleteParamDto,
  ): Promise<ApiResponse<ReturnType<Athlete['toJSON']>>> {
    const athlete = await this.removeAthleteFromTeamUseCase.execute({
      teamId: params.id,
      athleteId: params.athleteId,
    });

    return {
      data: athlete.toJSON(),
      error: null,
    };
  }
}
