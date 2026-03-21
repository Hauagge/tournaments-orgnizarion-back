import { Inject, Injectable } from '@nestjs/common';
import { IAthleteRepository } from '@/domain/athlete/repository/IAthleteRepository.repository';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { WeighInStatus } from '../../domain/value-objects/weigh-in-status.enum';
import { IWeighInRepository } from '../../repository/IWeighInRepository.repository';
import { WeighInStatusView } from './weigh-in-status.view';

export type GetWeighInStatusInput = {
  competitionId: number;
  athleteId: number;
};

@Injectable()
export class GetWeighInStatusUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
    @Inject(IWeighInRepository)
    private readonly weighInRepository: IWeighInRepository,
  ) {}

  async execute(input: GetWeighInStatusInput): Promise<WeighInStatusView> {
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

    const weighIn = await this.weighInRepository.findByCompetitionIdAndAthleteId(
      input.competitionId,
      input.athleteId,
    );

    return {
      id: weighIn?.id ?? null,
      competitionId: athlete.competitionId,
      athleteId: athlete.id as number,
      athleteName: athlete.fullName,
      declaredWeightGrams: athlete.declaredWeightGrams,
      measuredWeightGrams: weighIn?.measuredWeightGrams ?? null,
      status: weighIn?.status ?? WeighInStatus.PENDING,
      performedAt: weighIn?.performedAt ?? null,
      performedBy: weighIn?.performedBy ?? null,
    };
  }
}
