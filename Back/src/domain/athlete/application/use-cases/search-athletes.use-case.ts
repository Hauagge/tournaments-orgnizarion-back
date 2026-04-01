import { Inject, Injectable } from '@nestjs/common';
import { IAcademyRepository } from '@/domain/academy/repository/IAcademyRepository.repository';
import { WeighInStatus } from '@/domain/weighin/domain/value-objects/weigh-in-status.enum';
import { IWeighInRepository } from '@/domain/weighin/repository/IWeighInRepository.repository';
import { IAthleteRepository } from '../../repository/IAthleteRepository.repository';
import { AthleteListItemView } from './athlete-list-item.view';

export type SearchAthletesInput = {
  competitionId: number;
  query?: string;
  academyId?: number;
};

@Injectable()
export class SearchAthletesUseCase {
  constructor(
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
    @Inject(IAcademyRepository)
    private readonly academyRepository: IAcademyRepository,
    @Inject(IWeighInRepository)
    private readonly weighInRepository: IWeighInRepository,
  ) {}

  async execute(input: SearchAthletesInput): Promise<AthleteListItemView[]> {
    const athletes = await this.athleteRepository.search({
      competitionId: input.competitionId,
      query: input.query,
      academyId: input.academyId,
    });

    const athleteIds = athletes
      .map((athlete) => athlete.id)
      .filter((id): id is number => id !== undefined);

    const [academies, weighIns] = await Promise.all([
      this.academyRepository.listByCompetitionId(input.competitionId),
      athleteIds.length
        ? this.weighInRepository.findByCompetitionIdAndAthleteIds(
            input.competitionId,
            athleteIds,
          )
        : Promise.resolve([]),
    ]);

    const academyNameById = new Map(
      academies.map((academy) => [academy.id as number, academy.name]),
    );
    const weighInStatusByAthleteId = new Map(
      weighIns.map((weighIn) => [weighIn.athleteId, weighIn.status]),
    );

    return athletes.map((athlete) => ({
      ...athlete.toJSON(),
      academyName:
        athlete.academyId !== null
          ? academyNameById.get(athlete.academyId) ?? null
          : null,
      weighInStatus:
        weighInStatusByAthleteId.get(athlete.id as number) ??
        WeighInStatus.PENDING,
    }));
  }
}
