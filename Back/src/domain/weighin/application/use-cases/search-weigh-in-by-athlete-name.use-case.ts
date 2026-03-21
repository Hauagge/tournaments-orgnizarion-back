import { Inject, Injectable } from '@nestjs/common';
import { IAthleteRepository } from '@/domain/athlete/repository/IAthleteRepository.repository';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { WeighInStatus } from '../../domain/value-objects/weigh-in-status.enum';
import { IWeighInRepository } from '../../repository/IWeighInRepository.repository';
import { WeighInStatusView } from './weigh-in-status.view';

export type SearchWeighInByAthleteNameInput = {
  competitionId: number;
  query?: string;
};

@Injectable()
export class SearchWeighInByAthleteNameUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
    @Inject(IWeighInRepository)
    private readonly weighInRepository: IWeighInRepository,
  ) {}

  async execute(
    input: SearchWeighInByAthleteNameInput,
  ): Promise<WeighInStatusView[]> {
    const competition = await this.competitionRepository.findById(
      input.competitionId,
    );

    if (!competition) {
      throw new NotFoundError(
        `Competition with id ${input.competitionId} not found`,
      );
    }

    const athletes = await this.athleteRepository.search({
      competitionId: input.competitionId,
      query: input.query,
    });

    const athleteIds = athletes
      .map((athlete) => athlete.id)
      .filter((id): id is number => id !== undefined);

    const weighIns = athleteIds.length
      ? await this.weighInRepository.findByCompetitionIdAndAthleteIds(
          input.competitionId,
          athleteIds,
        )
      : [];

    const weighInsByAthleteId = new Map(
      weighIns.map((weighIn) => [weighIn.athleteId, weighIn]),
    );

    return athletes.map((athlete) => {
      const weighIn = weighInsByAthleteId.get(athlete.id as number);

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
    });
  }
}
