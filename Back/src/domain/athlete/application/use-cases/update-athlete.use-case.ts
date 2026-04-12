import { Inject, Injectable } from '@nestjs/common';
import { IAcademyRepository } from '@/domain/academy/repository/IAcademyRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { Athlete } from '../../domain/entities/athlete.entity';
import { PaymentStatus } from '../../domain/value-objects/payment-status.enum';
import { IAthleteRepository } from '../../repository/IAthleteRepository.repository';

export type UpdateAthleteInput = {
  id: number;
  fullName?: string;
  birthDate?: Date;
  belt?: string;
  declaredWeightGrams?: number;
  paymentStatus?: PaymentStatus;
  academyId?: number | null;
};

@Injectable()
export class UpdateAthleteUseCase {
  constructor(
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
    @Inject(IAcademyRepository)
    private readonly academyRepository: IAcademyRepository,
  ) {}

  async execute(input: UpdateAthleteInput): Promise<Athlete> {
    const athlete = await this.athleteRepository.findById(input.id);

    if (!athlete) {
      throw new NotFoundError(`Athlete with id ${input.id} not found`);
    }

    if (input.academyId !== undefined && input.academyId !== null) {
      const academy = await this.academyRepository.findById(input.academyId);

      if (!academy) {
        throw new NotFoundError(`Academy with id ${input.academyId} not found`);
      }

      if (academy.competitionId !== athlete.competitionId) {
        throw new ValidationError(
          'Athlete cannot be linked to an academy from another competition',
        );
      }
    }

    const updatedAthlete = athlete.update({
      fullName: input.fullName,
      birthDate: input.birthDate,
      belt: input.belt,
      declaredWeight: input.declaredWeightGrams,
      paymentStatus: input.paymentStatus,
      academyId: input.academyId,
    });

    return this.athleteRepository.update(updatedAthlete);
  }
}
