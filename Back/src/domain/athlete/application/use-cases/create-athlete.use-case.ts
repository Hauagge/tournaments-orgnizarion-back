import { Inject, Injectable } from '@nestjs/common';
import { IAcademyRepository } from '@/domain/academy/repository/IAcademyRepository.repository';
import { WeighIn } from '@/domain/weighin/domain/entities/weigh-in.entity';
import { WeighInStatus } from '@/domain/weighin/domain/value-objects/weigh-in-status.enum';
import { IWeighInRepository } from '@/domain/weighin/repository/IWeighInRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { Athlete } from '../../domain/entities/athlete.entity';
import { AthleteGender } from '../../domain/value-objects/athlete-gender.enum';
import { PaymentStatus } from '../../domain/value-objects/payment-status.enum';
import { IAthleteRepository } from '../../repository/IAthleteRepository.repository';

export type CreateAthleteInput = {
  competitionId: number;
  fullName: string;
  documentNumber: string | null;
  birthDate: Date;
  belt: string;
  gender?: AthleteGender | null;
  declaredWeight: number;
  paymentStatus?: PaymentStatus;
  weighInStatus?: WeighInStatus.PENDING | WeighInStatus.APPROVED;
  academyId: number | null;
};

@Injectable()
export class CreateAthleteUseCase {
  constructor(
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
    @Inject(IAcademyRepository)
    private readonly academyRepository: IAcademyRepository,
    @Inject(IWeighInRepository)
    private readonly weighInRepository: IWeighInRepository,
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
    const createdAthlete = await this.athleteRepository.create(athlete);

    if (input.weighInStatus === WeighInStatus.APPROVED) {
      const weighIn = WeighIn.createPending({
        competitionId: createdAthlete.competitionId,
        athleteId: createdAthlete.id as number,
      }).confirm({
        measuredWeightGrams: createdAthlete.declaredWeight,
        status: WeighInStatus.APPROVED,
        performedBy: 'system',
      });

      await this.weighInRepository.save(weighIn);
    }

    return createdAthlete;
  }
}
