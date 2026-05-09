import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { AuthRole } from '@/domain/auth/auth-role.enum';
import { CompetitionAccessRole } from '@/domain/auth/competition-access-role.enum';
import { IUserCompetitionRepository } from '@/domain/auth/repository/IUserCompetitionRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ICompetitionRepository } from '../../repository/ICompetitionRepository.repository';

@Injectable()
export class CompetitionAccessService {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(IUserCompetitionRepository)
    private readonly userCompetitionRepository: IUserCompetitionRepository,
  ) {}

  async assertCanManageCompetitionUsers(input: {
    currentUserId: number;
    currentUserRole: AuthRole;
    competitionId: number;
  }): Promise<void> {
    const competition = await this.competitionRepository.findById(
      input.competitionId,
    );

    if (!competition) {
      throw new NotFoundError(
        `Competition with id ${input.competitionId} not found`,
      );
    }

    if (input.currentUserRole === AuthRole.ORGANIZATION) {
      return;
    }

    const access = await this.userCompetitionRepository.findByUserIdAndCompetitionId({
      userId: input.currentUserId,
      competitionId: input.competitionId,
    });

    if (access?.role !== CompetitionAccessRole.OWNER) {
      throw new ForbiddenException('Apenas o dono da competição pode gerenciar usuários');
    }
  }
}
