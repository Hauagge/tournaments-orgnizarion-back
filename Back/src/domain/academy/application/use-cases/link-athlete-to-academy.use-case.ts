import { Inject, Injectable } from '@nestjs/common';
import { Athlete } from '@/domain/athlete/domain/entities/athlete.entity';
import { IAthleteRepository } from '@/domain/athlete/repository/IAthleteRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { IAcademyRepository } from '../../repository/IAcademyRepository.repository';

export type LinkAthleteToAcademyInput = {
  academyId: number;
  athleteId: number;
};

@Injectable()
export class LinkAthleteToAcademyUseCase {
  constructor(
    @Inject(IAcademyRepository)
    private readonly academyRepository: IAcademyRepository,
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
  ) {}

  async execute(input: LinkAthleteToAcademyInput): Promise<Athlete> {
    const academy = await this.academyRepository.findById(input.academyId);

    if (!academy) {
      throw new NotFoundError(`Academy with id ${input.academyId} not found`);
    }

    const athlete = await this.athleteRepository.findById(input.athleteId);

    if (!athlete) {
      throw new NotFoundError(`Athlete with id ${input.athleteId} not found`);
    }

    if (athlete.competitionId !== academy.competitionId) {
      throw new ValidationError(
        'Athlete cannot be linked to an academy from another competition',
      );
    }

    return this.athleteRepository.update(
      athlete.update({
        academyId: academy.id ?? null,
      }),
    );
  }
}
