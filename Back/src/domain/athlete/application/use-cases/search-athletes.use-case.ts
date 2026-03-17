import { Inject, Injectable } from '@nestjs/common';
import { Athlete } from '../../domain/entities/athlete.entity';
import { IAthleteRepository } from '../../repository/IAthleteRepository.repository';

export type SearchAthletesInput = {
  competitionId: number;
  query?: string;
  teamId?: number;
};

@Injectable()
export class SearchAthletesUseCase {
  constructor(
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
  ) {}

  async execute(input: SearchAthletesInput): Promise<Athlete[]> {
    return this.athleteRepository.search({
      competitionId: input.competitionId,
      query: input.query,
      teamId: input.teamId,
    });
  }
}
