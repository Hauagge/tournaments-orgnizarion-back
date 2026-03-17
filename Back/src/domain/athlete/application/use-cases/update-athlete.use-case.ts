import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { Athlete } from '../../domain/entities/athlete.entity';
import { IAthleteRepository } from '../../repository/IAthleteRepository.repository';

export type UpdateAthleteInput = {
  id: number;
  fullName?: string;
  birthDate?: Date;
  belt?: string;
  declaredWeightGrams?: number;
  teamId?: number | null;
};

@Injectable()
export class UpdateAthleteUseCase {
  constructor(
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
  ) {}

  async execute(input: UpdateAthleteInput): Promise<Athlete> {
    const athlete = await this.athleteRepository.findById(input.id);

    if (!athlete) {
      throw new NotFoundError(`Athlete with id ${input.id} not found`);
    }

    const updatedAthlete = athlete.update({
      fullName: input.fullName,
      birthDate: input.birthDate,
      belt: input.belt,
      declaredWeightGrams: input.declaredWeightGrams,
      teamId: input.teamId,
    });

    return this.athleteRepository.update(updatedAthlete);
  }
}
