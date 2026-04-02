import { Controller, Get, Param, Post } from '@nestjs/common';
import { CompetitionIdParamDto, CompetitionIdParamSchema } from '@/domain/competition/infra/http/dtos/competition-id-param.dto';
import { ZodValidationPipe } from 'src/core/pipe/zod-validation.pipe';
import { ApiResponse } from 'src/shared/result/api-response.type';
import { GenerateCategoriesUseCase } from '../../application/use-cases/generate-categories.use-case';
import { GetCategoryUseCase } from '../../application/use-cases/get-category.use-case';
import { ListCategoriesUseCase } from '../../application/use-cases/list-categories.use-case';
import { CategoryDetailView } from '../../application/use-cases/category-detail.view';
import { Category } from '../../domain/entities/category.entity';
import { CategoryIdParamDto, CategoryIdParamSchema } from './dtos/category-id-param.dto';

@Controller()
export class CategoryController {
  constructor(
    private readonly generateCategoriesUseCase: GenerateCategoriesUseCase,
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
    private readonly getCategoryUseCase: GetCategoryUseCase,
  ) {}

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
