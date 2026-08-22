import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Roles } from '@/core/auth/infra/decorators/roles.decorator';
import { CurrentUser } from '@/core/auth/infra/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/core/auth/infra/guards/jwt-auth.guard';
import { RolesGuard } from '@/core/auth/infra/guards/roles.guard';
import { AuthenticatedUser } from '@/core/auth/infra/types/authenticated-user.type';
import { AuthRole } from '@/domain/auth/auth-role.enum';
import { FileInterceptor } from '@nestjs/platform-express';
import { ZodValidationPipe } from 'src/core/pipe/zod-validation.pipe';
import { ApiResponse } from 'src/shared/result/api-response.type';
import { AddUserToCompetitionUseCase } from '../../application/use-cases/add-user-to-competition.use-case';
import { CreateCompetitionUseCase } from '../../application/use-cases/create-competition.use-case';
import { GetCompetitionUseCase } from '../../application/use-cases/get-competition.use-case';
import { GetDashboardSummaryUseCase } from '../../application/use-cases/get-dashboard-summary.use-case';
import { ImportAthletesUseCase } from '../../application/use-cases/import-athletes.use-case';
import { ListCompetitionUsersUseCase } from '../../application/use-cases/list-competition-users.use-case';
import { ListCompetitionsUseCase } from '../../application/use-cases/list-competitions.use-case';
import { PreviewAthleteImportUseCase } from '../../application/use-cases/preview-athlete-import.use-case';
import { RemoveUserFromCompetitionUseCase } from '../../application/use-cases/remove-user-from-competition.use-case';
import { UpdateCompetitionSettingsUseCase } from '../../application/use-cases/update-competition-settings.use-case';
import { Competition } from '../../domain/entities/competition.entity';
import { CompetitionMode } from '../../domain/value-objects/competition-mode.enum';
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
import {
  ListCompetitionUsersDto,
  ListCompetitionUsersSchema,
} from './dtos/list-competition-users.dto';
import {
  CompetitionUserParamDto,
  CompetitionUserParamSchema,
} from './dtos/competition-user-param.dto';
import {
  ManageCompetitionUserDto,
  ManageCompetitionUserSchema,
} from './dtos/manage-competition-user.dto';
import {
  PreviewAthleteImportDto,
  PreviewAthleteImportSchema,
} from './dtos/preview-athlete-import.dto';

type UploadedCsvFile = {
  buffer: Buffer;
};

@Controller('competitions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AuthRole.STAFF, AuthRole.DESK, AuthRole.ORGANIZATION)
export class CompetitionController {
  constructor(
    private readonly createCompetitionUseCase: CreateCompetitionUseCase,
    private readonly updateCompetitionSettingsUseCase: UpdateCompetitionSettingsUseCase,
    private readonly getCompetitionUseCase: GetCompetitionUseCase,
    private readonly listCompetitionUsersUseCase: ListCompetitionUsersUseCase,
    private readonly listCompetitionsUseCase: ListCompetitionsUseCase,
    private readonly previewAthleteImportUseCase: PreviewAthleteImportUseCase,
    private readonly importAthletesUseCase: ImportAthletesUseCase,
    private readonly addUserToCompetitionUseCase: AddUserToCompetitionUseCase,
    private readonly removeUserFromCompetitionUseCase: RemoveUserFromCompetitionUseCase,
    private readonly getDashboardSummaryUseCase: GetDashboardSummaryUseCase,
  ) {}

  @Get()
  async list(
    @CurrentUser() currentUser: AuthenticatedUser,
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
    const result = await this.listCompetitionsUseCase.execute({
      currentUserId: currentUser.sub,
      ...query,
    });

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
  @Roles(AuthRole.STAFF, AuthRole.ORGANIZATION)
  async create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateCompetitionSchema))
    body: CreateCompetitionDto,
  ): Promise<ApiResponse<ReturnType<Competition['toJSON']>>> {
    const competition = await this.createCompetitionUseCase.execute({
      currentUserId: currentUser.sub,
      ...body,
      mode: body.mode as CompetitionMode,
    });
    return {
      data: competition.toJSON(),
      error: null,
    };
  }

  @Get('dashboard-summary')
  async dashboardSummary(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<ApiResponse<Awaited<ReturnType<GetDashboardSummaryUseCase['execute']>>>> {
    const data = await this.getDashboardSummaryUseCase.execute({
      currentUserId: currentUser.sub,
    });

    return {
      data,
      error: null,
    };
  }

  @Post(':id/users')
  @Roles(AuthRole.STAFF, AuthRole.ORGANIZATION)
  async addUser(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param(new ZodValidationPipe(CompetitionIdParamSchema))
    params: CompetitionIdParamDto,
    @Body(new ZodValidationPipe(ManageCompetitionUserSchema))
    body: ManageCompetitionUserDto,
  ): Promise<ApiResponse<true>> {
    await this.addUserToCompetitionUseCase.execute({
      currentUserId: currentUser.sub,
      currentUserRole: currentUser.role,
      competitionId: params.id,
      targetUserId: body.userId,
    });

    return {
      data: true,
      error: null,
    };
  }

  @Get(':id/users')
  @Roles(AuthRole.STAFF, AuthRole.ORGANIZATION)
  async listUsers(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param(new ZodValidationPipe(CompetitionIdParamSchema))
    params: CompetitionIdParamDto,
    @Query(new ZodValidationPipe(ListCompetitionUsersSchema))
    query: ListCompetitionUsersDto,
  ): Promise<
    ApiResponse<Awaited<ReturnType<ListCompetitionUsersUseCase['execute']>>>
  > {
    const users = await this.listCompetitionUsersUseCase.execute({
      currentUserId: currentUser.sub,
      currentUserRole: currentUser.role,
      competitionId: params.id,
      search: query.search ?? query.term,
    });

    return {
      data: users,
      error: null,
    };
  }

  @Delete(':id/users/:userId')
  @Roles(AuthRole.STAFF, AuthRole.ORGANIZATION)
  async removeUser(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param(new ZodValidationPipe(CompetitionUserParamSchema))
    params: CompetitionUserParamDto,
  ): Promise<ApiResponse<true>> {
    await this.removeUserFromCompetitionUseCase.execute({
      currentUserId: currentUser.sub,
      currentUserRole: currentUser.role,
      competitionId: params.id,
      targetUserId: params.userId,
    });

    return {
      data: true,
      error: null,
    };
  }

  @Patch(':id')
  @Roles(AuthRole.STAFF, AuthRole.ORGANIZATION)
  async update(
    @Param(new ZodValidationPipe(CompetitionIdParamSchema))
    params: CompetitionIdParamDto,
    @Body(new ZodValidationPipe(UpdateCompetitionSettingsSchema))
    body: UpdateCompetitionSettingsDto,
  ): Promise<ApiResponse<ReturnType<Competition['toJSON']>>> {
    const competition = await this.updateCompetitionSettingsUseCase.execute({
      id: params.id,
      name: body.name,
      mode: body.mode ? (body.mode as CompetitionMode) : undefined,
      fightDurationSeconds: body.fightDurationSeconds,
      weighInMarginGrams: body.weighInMarginGrams,
      ageSplitYears: body.ageSplitYears,
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

  @Post(':id/import/athletes/preview')
  @Roles(AuthRole.STAFF, AuthRole.ORGANIZATION)
  async previewAthletesImport(
    @Param(new ZodValidationPipe(CompetitionIdParamSchema))
    _params: CompetitionIdParamDto,
    @Body(new ZodValidationPipe(PreviewAthleteImportSchema))
    body: PreviewAthleteImportDto,
  ): Promise<
    ApiResponse<Awaited<ReturnType<PreviewAthleteImportUseCase['execute']>>>
  > {
    const result = await this.previewAthleteImportUseCase.execute(body);

    return {
      data: result,
      error: null,
    };
  }

  @Post(':id/import/athletes')
  @Roles(AuthRole.STAFF, AuthRole.ORGANIZATION)
  @UseInterceptors(FileInterceptor('file'))
  async importAthletes(
    @Param(new ZodValidationPipe(CompetitionIdParamSchema))
    params: CompetitionIdParamDto,
    @UploadedFile() file?: UploadedCsvFile,
  ): Promise<
    ApiResponse<Awaited<ReturnType<ImportAthletesUseCase['execute']>>>
  > {
    if (!file?.buffer?.length) {
      throw new BadRequestException({
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: {
            file: ['CSV file is required.'],
          },
        },
      });
    }

    const result = await this.importAthletesUseCase.execute({
      competitionId: params.id,
      csvText: file.buffer.toString('utf-8'),
    });

    return {
      data: result,
      error: null,
    };
  }
}
