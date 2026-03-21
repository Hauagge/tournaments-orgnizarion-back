import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { Team } from '../../domain/entities/team.entity';
import { ITeamRepository } from '../../repository/ITeamRepository.repository';

export type UpdateTeamInput = {
  id: number;
  name?: string;
};

@Injectable()
export class UpdateTeamUseCase {
  constructor(
    @Inject(ITeamRepository)
    private readonly teamRepository: ITeamRepository,
  ) {}

  async execute(input: UpdateTeamInput): Promise<Team> {
    const team = await this.teamRepository.findById(input.id);

    if (!team) {
      throw new NotFoundError('Team with id ' + input.id + ' not found');
    }

    if (!input.name) {
      return this.teamRepository.update(team.update({}));
    }

    const existingTeam = await this.teamRepository.findByCompetitionIdAndName(
      team.competitionId,
      input.name,
    );

    if (existingTeam && existingTeam.id === team.id) {
      throw new ValidationError('Team already exists for this competition');
    }

    return this.teamRepository.update(
      team.update({
        name: input.name,
      }),
    );
  }
}
