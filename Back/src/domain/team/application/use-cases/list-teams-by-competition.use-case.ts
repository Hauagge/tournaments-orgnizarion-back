import { Inject, Injectable } from '@nestjs/common';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { Team } from '../../domain/entities/team.entity';
import { ITeamRepository } from '../../repository/ITeamRepository.repository';

export type ListTeamsByCompetitionInput = {
  competitionId: number;
};

@Injectable()
export class ListTeamsByCompetitionUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(ITeamRepository)
    private readonly teamRepository: ITeamRepository,
  ) {}

  async execute(input: ListTeamsByCompetitionInput): Promise<Team[]> {
    const competition = await this.competitionRepository.findById(
      input.competitionId,
    );

    if (!competition) {
      throw new NotFoundError(
        'Competition with id ' + input.competitionId + ' not found',
      );
    }

    return this.teamRepository.listByCompetitionId(input.competitionId);
  }
}
