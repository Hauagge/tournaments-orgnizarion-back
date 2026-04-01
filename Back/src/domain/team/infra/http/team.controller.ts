import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ZodValidationPipe } from 'src/core/pipe/zod-validation.pipe';
import { ApiResponse } from 'src/shared/result/api-response.type';
import { AddTeamMemberUseCase } from '../../application/use-cases/add-team-member.use-case';
import { CreateTeamUseCase } from '../../application/use-cases/create-team.use-case';
import { GetTeamDetailsUseCase } from '../../application/use-cases/get-team-details.use-case';
import { ListTeamsByCompetitionUseCase } from '../../application/use-cases/list-teams-by-competition.use-case';
import { RemoveTeamMemberUseCase } from '../../application/use-cases/remove-team-member.use-case';
import { TeamDetailsView } from '../../application/use-cases/team-details.view';
import { TeamListItemView } from '../../application/use-cases/team-list-item.view';
import { UpdateTeamUseCase } from '../../application/use-cases/update-team.use-case';
import { Team } from '../../domain/entities/team.entity';
import {
  CompetitionTeamParamDto,
  CompetitionTeamParamSchema,
} from './dtos/competition-team-param.dto';
import { CreateTeamDto, CreateTeamSchema } from './dtos/create-team.dto';
import { TeamIdParamDto, TeamIdParamSchema } from './dtos/team-id-param.dto';
import {
  TeamMemberParamDto,
  TeamMemberParamSchema,
} from './dtos/team-member-param.dto';
import { UpdateTeamDto, UpdateTeamSchema } from './dtos/update-team.dto';

@Controller()
export class TeamController {
  constructor(
    private readonly createTeamUseCase: CreateTeamUseCase,
    private readonly listTeamsByCompetitionUseCase: ListTeamsByCompetitionUseCase,
    private readonly getTeamDetailsUseCase: GetTeamDetailsUseCase,
    private readonly updateTeamUseCase: UpdateTeamUseCase,
    private readonly addTeamMemberUseCase: AddTeamMemberUseCase,
    private readonly removeTeamMemberUseCase: RemoveTeamMemberUseCase,
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
  ): Promise<ApiResponse<TeamListItemView[]>> {
    const teams = await this.listTeamsByCompetitionUseCase.execute({
      competitionId: params.id,
    });

    return {
      data: teams,
      error: null,
    };
  }

  @Get('teams/:id')
  async getDetails(
    @Param(new ZodValidationPipe(TeamIdParamSchema))
    params: TeamIdParamDto,
  ): Promise<ApiResponse<TeamDetailsView>> {
    const team = await this.getTeamDetailsUseCase.execute(params.id);

    return {
      data: team,
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

  @Post('teams/:id/members/:athleteId')
  async addMember(
    @Param(new ZodValidationPipe(TeamMemberParamSchema))
    params: TeamMemberParamDto,
  ) {
    const member = await this.addTeamMemberUseCase.execute({
      teamId: params.id,
      athleteId: params.athleteId,
    });

    return {
      data: member.toJSON(),
      error: null,
    };
  }

  @Delete('teams/:id/members/:athleteId')
  async removeMember(
    @Param(new ZodValidationPipe(TeamMemberParamSchema))
    params: TeamMemberParamDto,
  ) {
    await this.removeTeamMemberUseCase.execute({
      teamId: params.id,
      athleteId: params.athleteId,
    });

    return {
      data: true,
      error: null,
    };
  }
}
