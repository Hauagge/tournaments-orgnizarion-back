import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { AuthRole } from '@/domain/auth/auth-role.enum';
import { CompetitionAccessRole } from '@/domain/auth/competition-access-role.enum';
import { IUserCompetitionRepository } from '@/domain/auth/repository/IUserCompetitionRepository.repository';
import { IUserRepository } from '@/domain/auth/repository/IUserRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { CompetitionAccessService } from '../services/competition-access.service';

export type AddUserToCompetitionInput = {
  currentUserId: number;
  currentUserRole: AuthRole;
  competitionId: number;
  targetUserId: number;
};

@Injectable()
export class AddUserToCompetitionUseCase {
  constructor(
    private readonly competitionAccessService: CompetitionAccessService,
    @Inject(IUserRepository)
    private readonly userRepository: IUserRepository,
    @Inject(IUserCompetitionRepository)
    private readonly userCompetitionRepository: IUserCompetitionRepository,
  ) {}

  async execute(input: AddUserToCompetitionInput): Promise<void> {
    await this.competitionAccessService.assertCanManageCompetitionUsers({
      currentUserId: input.currentUserId,
      currentUserRole: input.currentUserRole,
      competitionId: input.competitionId,
    });

    const user = await this.userRepository.findById(input.targetUserId);

    if (!user) {
      throw new NotFoundError(`User with id ${input.targetUserId} not found`);
    }

    // if (user.role === AuthRole.PUBLIC) {
    //   throw new ForbiddenException('Usuários public não podem ser vinculados à competição');
    // }

    await this.userCompetitionRepository.grantAccess({
      userId: input.targetUserId,
      competitionId: input.competitionId,
      role: CompetitionAccessRole.MEMBER,
    });
  }
}
