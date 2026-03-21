import { Inject, Injectable } from '@nestjs/common';
import { Athlete } from '@/domain/athlete/domain/entities/athlete.entity';
import { IAthleteRepository } from '@/domain/athlete/repository/IAthleteRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { ITeamRepository } from '../../repository/ITeamRepository.repository';

export type RemoveAthleteFromTeamInput = {
  teamId: number;
  athleteId: number;
};

@Injectable()
export class RemoveAthleteFromTeamUseCase {
  constructor(
    @Inject(ITeamRepository)
    private readonly teamRepository: ITeamRepository,
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
  ) {}

  async execute(input: RemoveAthleteFromTeamInput): Promise<Athlete> {
    const team = await this.teamRepository.findById(input.teamId);

    if (!team) {
      throw new NotFoundError('Team with id ' + input.teamId + ' not found');
    }

    const athlete = await this.athleteRepository.findById(input.athleteId);

    if (!athlete) {
      throw new NotFoundError(
        'Athlete with id ' + input.athleteId + ' not found',
      );
    }

    if (athlete.competitionId !== team.competitionId) {
      throw new ValidationError(
        'Athlete cannot be unlinked from a team from another competition',
      );
    }

    if (athlete.teamId !== team.id) {
      throw new ValidationError('Athlete is not linked to this team');
    }

    const updatedAthlete = athlete.update({
      teamId: null,
    });

    return this.athleteRepository.update(updatedAthlete);
  }
}
