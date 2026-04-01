import { Inject, Injectable } from '@nestjs/common';
import { IAcademyRepository } from '@/domain/academy/repository/IAcademyRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { Athlete } from '../../domain/entities/athlete.entity';
import { IAthleteRepository } from '../../repository/IAthleteRepository.repository';

export type CreateAthleteInput = {
  competitionId: number;
  fullName: string;
  birthDate: Date;
  belt: string;
  declaredWeightGrams: number;
  academyId: number | null;
};

@Injectable()
export class CreateAthleteUseCase {
  constructor(
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
    @Inject(IAcademyRepository)
    private readonly academyRepository: IAcademyRepository,
  ) {}

  async execute(input: CreateAthleteInput): Promise<Athlete> {
    if (input.academyId !== null) {
      const academy = await this.academyRepository.findById(input.academyId);

      if (!academy) {
        throw new NotFoundError(`Academy with id ${input.academyId} not found`);
      }

      if (academy.competitionId !== input.competitionId) {
        throw new ValidationError(
          'Athlete cannot be linked to an academy from another competition',
        );
      }
    }

    const athlete = Athlete.create(input);
    return this.athleteRepository.create(athlete);
  }
}
