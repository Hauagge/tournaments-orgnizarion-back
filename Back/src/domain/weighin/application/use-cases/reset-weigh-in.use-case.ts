import { Inject, Injectable } from '@nestjs/common';
import { IAthleteRepository } from '@/domain/athlete/repository/IAthleteRepository.repository';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { WeighIn } from '../../domain/entities/weigh-in.entity';
import { IWeighInRepository } from '../../repository/IWeighInRepository.repository';

export type ResetWeighInInput = {
  competitionId: number;
  athleteId: number;
};

@Injectable()
export class ResetWeighInUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
    @Inject(IWeighInRepository)
    private readonly weighInRepository: IWeighInRepository,
  ) {}

  async execute(input: ResetWeighInInput): Promise<WeighIn> {
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

    const weighIn = (
      existingWeighIn ??
      WeighIn.createPending({
        competitionId: input.competitionId,
        athleteId: input.athleteId,
      })
    ).reset();

    return this.weighInRepository.save(weighIn);
  }
}
