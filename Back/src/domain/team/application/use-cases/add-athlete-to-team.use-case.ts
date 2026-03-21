import { Inject, Injectable } from '@nestjs/common';
import { Athlete } from '@/domain/athlete/domain/entities/athlete.entity';
import { IAthleteRepository } from '@/domain/athlete/repository/IAthleteRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { ITeamRepository } from '../../repository/ITeamRepository.repository';

export type AddAthleteToTeamInput = {
  teamId: number;
  athleteId: number;
};

@Injectable()
export class AddAthleteToTeamUseCase {
  constructor(
    @Inject(ITeamRepository)
    private readonly teamRepository: ITeamRepository,
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
  ) {}

  async execute(input: AddAthleteToTeamInput): Promise<Athlete> {
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
        'Athlete cannot be linked to a team from another competition',
      );
    }
    const updatedAthlete = athlete.update({
      teamId: team.id ?? null,
    });

    return this.athleteRepository.update(updatedAthlete);
  }
}
