import { Inject, Injectable } from '@nestjs/common';
import { Athlete } from '../../domain/entities/athlete.entity';
import { IAthleteRepository } from '../../repository/IAthleteRepository.repository';

export type CreateAthleteInput = {
  competitionId: number;
  fullName: string;
  birthDate: Date;
  belt: string;
  declaredWeightGrams: number;
  teamId: number | null;
};

@Injectable()
export class CreateAthleteUseCase {
  constructor(
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
  ) {}

  async execute(input: CreateAthleteInput): Promise<Athlete> {
    const athlete = Athlete.create(input);
    return this.athleteRepository.create(athlete);
  }
}
