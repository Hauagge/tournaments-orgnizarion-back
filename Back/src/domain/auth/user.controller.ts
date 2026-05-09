import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@/core/auth/infra/decorators/current-user.decorator';
import { Roles } from '@/core/auth/infra/decorators/roles.decorator';
import { JwtAuthGuard } from '@/core/auth/infra/guards/jwt-auth.guard';
import { RolesGuard } from '@/core/auth/infra/guards/roles.guard';
import { AuthenticatedUser } from '@/core/auth/infra/types/authenticated-user.type';
import { ZodValidationPipe } from '@/core/pipe/zod-validation.pipe';
import { ApiResponse } from '@/shared/result/api-response.type';
import { AuthRole } from './auth-role.enum';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case';
import { ListUsersDto, ListUsersSchema } from './dto/list-users.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AuthRole.STAFF, AuthRole.ORGANIZATION)
export class UserController {
  constructor(private readonly listUsersUseCase: ListUsersUseCase) {}

  @Get()
  async list(
    @CurrentUser() _currentUser: AuthenticatedUser,
    @Query(new ZodValidationPipe(ListUsersSchema))
    query: ListUsersDto,
  ): Promise<ApiResponse<Awaited<ReturnType<ListUsersUseCase['execute']>>>> {
    const users = await this.listUsersUseCase.execute({
      term: query.search,
    });

    return {
      data: users,
      error: null,
    };
  }
}
