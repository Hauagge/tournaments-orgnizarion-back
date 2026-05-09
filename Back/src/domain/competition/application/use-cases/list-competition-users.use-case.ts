import { Inject, Injectable } from '@nestjs/common';
import { AuthRole } from '@/domain/auth/auth-role.enum';
import { IUserCompetitionRepository } from '@/domain/auth/repository/IUserCompetitionRepository.repository';
import { CompetitionAccessRole } from '@/domain/auth/competition-access-role.enum';
import { CompetitionAccessService } from '../services/competition-access.service';

export type ListCompetitionUsersInput = {
  currentUserId: number;
  currentUserRole: AuthRole;
  competitionId: number;
  search?: string;
};

export type ListCompetitionUsersOutput = Array<{
  userId: number;
  username: string;
  role: AuthRole;
  academyId: number | null;
  competitionAccessRole: CompetitionAccessRole;
}>;

@Injectable()
export class ListCompetitionUsersUseCase {
  constructor(
    private readonly competitionAccessService: CompetitionAccessService,
    @Inject(IUserCompetitionRepository)
    private readonly userCompetitionRepository: IUserCompetitionRepository,
  ) {}

  async execute(
    input: ListCompetitionUsersInput,
  ): Promise<ListCompetitionUsersOutput> {
    await this.competitionAccessService.assertCanManageCompetitionUsers({
      currentUserId: input.currentUserId,
      currentUserRole: input.currentUserRole,
      competitionId: input.competitionId,
    });

    const links = await this.userCompetitionRepository.listByCompetitionId({
      competitionId: input.competitionId,
      search: input.search,
    });

    return links
      .filter((link) => link.user)
      .map((link) => ({
        userId: link.userId,
        username: link.user!.username,
        role: link.user!.role,
        academyId: link.user!.academyId,
        competitionAccessRole: link.role,
      }));
  }
}
