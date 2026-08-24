import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IUserCompetitionRepository } from '@/domain/auth/repository/IUserCompetitionRepository.repository';
import { ICategoryRepository } from '@/domain/category/repository/ICategoryRepository.repository';
import { IFightRepository } from '@/domain/fight/repository/IFightRepository.repository';
import { IKeyGroupRepository } from '@/domain/key-group/repository/IKeyGroupRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import {
  COMPETITION_ACCESS_KEY,
  CompetitionAccessResolver,
} from '../decorators/competition-access.decorator';
import { AuthenticatedUser } from '../types/authenticated-user.type';

@Injectable()
export class CompetitionAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(IUserCompetitionRepository)
    private readonly userCompetitionRepository: IUserCompetitionRepository,
    @Optional()
    @Inject(ICategoryRepository)
    private readonly categoryRepository?: ICategoryRepository,
    @Optional()
    @Inject(IKeyGroupRepository)
    private readonly keyGroupRepository?: IKeyGroupRepository,
    @Optional()
    @Inject(IFightRepository)
    private readonly fightRepository?: IFightRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resolver = this.reflector.getAllAndOverride<CompetitionAccessResolver>(
      COMPETITION_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!resolver) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ params: Record<string, string>; user?: AuthenticatedUser }>();

    const userId = request.user?.sub;
    if (!userId) {
      throw new ForbiddenException(
        'Usuario autenticado nao possui acesso a esta competicao',
      );
    }

    const competitionId = await this.resolveCompetitionId(
      resolver,
      request.params,
    );

    if (competitionId === null) {
      throw new NotFoundError('Recurso informado nao foi encontrado');
    }

    const access =
      await this.userCompetitionRepository.findByUserIdAndCompetitionId({
        userId,
        competitionId,
      });

    if (!access) {
      throw new ForbiddenException(
        'Usuario autenticado nao possui acesso a esta competicao',
      );
    }

    return true;
  }

  private async resolveCompetitionId(
    resolver: CompetitionAccessResolver,
    params: Record<string, string>,
  ): Promise<number | null> {
    const rawId = Number(params[resolver.param]);
    if (!Number.isFinite(rawId)) {
      return null;
    }

    switch (resolver.type) {
      case 'competition':
        return rawId;

      case 'category': {
        const category = await this.categoryRepository?.findById(rawId);
        return category ? category.competitionId : null;
      }

      case 'keyGroup': {
        const keyGroup = await this.keyGroupRepository?.findById(rawId);
        return keyGroup ? keyGroup.competitionId : null;
      }

      case 'fight': {
        const fight = await this.fightRepository?.findById(rawId);
        return fight ? fight.competitionId : null;
      }
    }
  }
}
