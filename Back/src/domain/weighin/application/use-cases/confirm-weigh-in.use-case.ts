import { Inject, Injectable } from '@nestjs/common';
import { IAthleteRepository } from '@/domain/athlete/repository/IAthleteRepository.repository';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { WeighIn } from '../../domain/entities/weigh-in.entity';
import { WeighInStatus } from '../../domain/value-objects/weigh-in-status.enum';
import { IWeighInRepository } from '../../repository/IWeighInRepository.repository';

export type ConfirmWeighInInput = {
  competitionId: number;
  athleteId: number;
  measuredWeightGrams: number;
  performedBy?: string;
};

@Injectable()
export class ConfirmWeighInUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
    @Inject(IWeighInRepository)
    private readonly weighInRepository: IWeighInRepository,
  ) {}

  async execute(input: ConfirmWeighInInput): Promise<WeighIn> {
    const competition = await this.competitionRepository.findById(
      input.competitionId,
    );

    if (!competition) {
      throw new NotFoundError(
        `Competition with id ${input.competitionId} not found`,
      );
    }

    const athlete = await this.athleteRepository.findById(input.athleteId);

    if (!athlete) {
      throw new NotFoundError(`Athlete with id ${input.athleteId} not found`);
    }

    if (athlete.competitionId !== competition.id) {
      throw new ValidationError(
        'Athlete cannot be weighed in for another competition',
      );
    }

    const existingWeighIn =
      await this.weighInRepository.findByCompetitionIdAndAthleteId(
        input.competitionId,
        input.athleteId,
      );

    const status =
      input.measuredWeightGrams >
      athlete.declaredWeightGrams + competition.weighInMarginGrams
        ? WeighInStatus.REJECTED
        : WeighInStatus.APPROVED;

    const weighIn = (existingWeighIn ??
      WeighIn.createPending({
        competitionId: input.competitionId,
        athleteId: input.athleteId,
      })).confirm({
      measuredWeightGrams: input.measuredWeightGrams,
      status,
      performedBy: input.performedBy?.trim() || 'system',
    });

    return this.weighInRepository.save(weighIn);
  }
}
