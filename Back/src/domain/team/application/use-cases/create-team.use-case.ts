import { Inject, Injectable } from '@nestjs/common';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { Team } from '../../domain/entities/team.entity';
import { ITeamRepository } from '../../repository/ITeamRepository.repository';

export type CreateTeamInput = {
  competitionId: number;
  name: string;
};

@Injectable()
export class CreateTeamUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(ITeamRepository)
    private readonly teamRepository: ITeamRepository,
  ) {}

  async execute(input: CreateTeamInput): Promise<Team> {
    const competition = await this.competitionRepository.findById(
      input.competitionId,
    );

    if (!competition) {
      throw new NotFoundError(
        'Competition with id ' + input.competitionId + ' not found',
      );
    }

    const existingTeam = await this.teamRepository.findByCompetitionIdAndName(
      input.competitionId,
      input.name,
    );

    if (existingTeam) {
      throw new ValidationError('Team already exists for this competition');
    }
    return this.teamRepository.create(Team.create(input));
  }
}
