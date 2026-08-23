import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Roles } from '@/core/auth/infra/decorators/roles.decorator';
import { JwtAuthGuard } from '@/core/auth/infra/guards/jwt-auth.guard';
import { RolesGuard } from '@/core/auth/infra/guards/roles.guard';
import { AuthRole } from '@/domain/auth/auth-role.enum';
import {
  CompetitionIdParamDto,
  CompetitionIdParamSchema,
} from '@/domain/competition/infra/http/dtos/competition-id-param.dto';
import { ZodValidationPipe } from 'src/core/pipe/zod-validation.pipe';
import { ApiResponse } from 'src/shared/result/api-response.type';
import { AddAthleteToCategoryUseCase } from '../../application/use-cases/add-athlete-to-category.use-case';
import { AddAthleteToCategoryView } from '../../application/use-cases/add-athlete-to-category.view';
import { CreateCategoryUseCase } from '../../application/use-cases/create-category.use-case';
import { DistributeAthletesUseCase } from '../../application/use-cases/distribute-athletes.use-case';
import { DistributeAthletesView } from '../../application/use-cases/distribute-athletes.view';
import { GenerateCategoriesUseCase } from '../../application/use-cases/generate-categories.use-case';
import { GetCategoryUseCase } from '../../application/use-cases/get-category.use-case';
import { ListCategoriesUseCase } from '../../application/use-cases/list-categories.use-case';
import { CategoryDetailView } from '../../application/use-cases/category-detail.view';
import { Category } from '../../domain/entities/category.entity';
import {
  AddAthleteToCategoryDto,
  AddAthleteToCategorySchema,
} from './dtos/add-athlete-to-category.dto';
import {
  AddAthleteToCategoryParamDto,
  AddAthleteToCategoryParamSchema,
} from './dtos/add-athlete-to-category-param.dto';
import {
  CategoryIdParamDto,
  CategoryIdParamSchema,
} from './dtos/category-id-param.dto';
import {
  CreateCategoryDto,
  CreateCategorySchema,
} from './dtos/create-category.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AuthRole.STAFF, AuthRole.DESK, AuthRole.ORGANIZATION)
export class CategoryController {
  constructor(
    private readonly addAthleteToCategoryUseCase: AddAthleteToCategoryUseCase,
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly generateCategoriesUseCase: GenerateCategoriesUseCase,
    private readonly distributeAthletesUseCase: DistributeAthletesUseCase,
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
    private readonly getCategoryUseCase: GetCategoryUseCase,
  ) {}

  @Post('competitions/:competitionId/categories/:categoryId/athletes')
  async addAthlete(
    @Param(new ZodValidationPipe(AddAthleteToCategoryParamSchema))
    params: AddAthleteToCategoryParamDto,
    @Body(new ZodValidationPipe(AddAthleteToCategorySchema))
    body: AddAthleteToCategoryDto,
  ): Promise<ApiResponse<AddAthleteToCategoryView>> {
    const result = await this.addAthleteToCategoryUseCase.execute({
      ...params,
      athleteId: body.athleteId,
    });

    return {
      data: result,
      error: null,
    };
  }

  @Post('competitions/:id/categories')
  async create(
    @Param(new ZodValidationPipe(CompetitionIdParamSchema))
    params: CompetitionIdParamDto,
    @Body(new ZodValidationPipe(CreateCategorySchema))
    body: CreateCategoryDto,
  ): Promise<ApiResponse<ReturnType<Category['toJSON']>>> {
    const category = await this.createCategoryUseCase.execute({
      competitionId: params.id,
      ...body,
    });

    return {
      data: category.toJSON(),
      error: null,
    };
  }

  @Post('competitions/:id/categories/generate')
  async generate(
    @Param(new ZodValidationPipe(CompetitionIdParamSchema))
    params: CompetitionIdParamDto,
  ): Promise<ApiResponse<{ items: ReturnType<Category['toJSON']>[] }>> {
    const categories = await this.generateCategoriesUseCase.execute({
      competitionId: params.id,
    });

    return {
      data: {
        items: categories.map((category) => category.toJSON()),
      },
      error: null,
    };
  }

  @Post('competitions/:id/categories/distribute-athletes')
  async distributeAthletes(
    @Param(new ZodValidationPipe(CompetitionIdParamSchema))
    params: CompetitionIdParamDto,
  ): Promise<ApiResponse<DistributeAthletesView>> {
    const result = await this.distributeAthletesUseCase.execute({
      competitionId: params.id,
    });

    return {
      data: result,
      error: null,
    };
  }

  @Get('competitions/:id/categories')
  async listByCompetition(
    @Param(new ZodValidationPipe(CompetitionIdParamSchema))
    params: CompetitionIdParamDto,
  ): Promise<ApiResponse<ReturnType<Category['toJSON']>[]>> {
    const categories = await this.listCategoriesUseCase.execute(params.id);

    return {
      data: categories.map((category) => category.toJSON()),
      error: null,
    };
  }

  @Get('categories/:id')
  async getById(
    @Param(new ZodValidationPipe(CategoryIdParamSchema))
    params: CategoryIdParamDto,
  ): Promise<ApiResponse<CategoryDetailView>> {
    const category = await this.getCategoryUseCase.execute(params.id);

    return {
      data: category,
      error: null,
    };
  }
}
