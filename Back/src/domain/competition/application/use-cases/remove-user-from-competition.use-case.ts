import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { AuthRole } from '@/domain/auth/auth-role.enum';
import { CompetitionAccessRole } from '@/domain/auth/competition-access-role.enum';
import { IUserCompetitionRepository } from '@/domain/auth/repository/IUserCompetitionRepository.repository';
import { CompetitionAccessService } from '../services/competition-access.service';

export type RemoveUserFromCompetitionInput = {
  currentUserId: number;
  currentUserRole: AuthRole;
  competitionId: number;
  targetUserId: number;
};

@Injectable()
export class RemoveUserFromCompetitionUseCase {
  constructor(
    private readonly competitionAccessService: CompetitionAccessService,
    @Inject(IUserCompetitionRepository)
    private readonly userCompetitionRepository: IUserCompetitionRepository,
  ) {}

  async execute(input: RemoveUserFromCompetitionInput): Promise<void> {
    await this.competitionAccessService.assertCanManageCompetitionUsers({
      currentUserId: input.currentUserId,
      currentUserRole: input.currentUserRole,
      competitionId: input.competitionId,
    });

    const targetAccess =
      await this.userCompetitionRepository.findByUserIdAndCompetitionId({
        userId: input.targetUserId,
        competitionId: input.competitionId,
      });

    if (targetAccess?.role === CompetitionAccessRole.OWNER) {
      throw new ForbiddenException('O dono da competição não pode ser removido');
    }

    await this.userCompetitionRepository.revokeAccess({
      userId: input.targetUserId,
      competitionId: input.competitionId,
    });
  }
}
