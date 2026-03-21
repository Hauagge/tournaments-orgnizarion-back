import { Inject, Injectable } from '@nestjs/common';
import { ITeamRepository } from '@/domain/team/repository/ITeamRepository.repository';
import { IWeighInRepository } from '@/domain/weighin/repository/IWeighInRepository.repository';
import { WeighInStatus } from '@/domain/weighin/domain/value-objects/weigh-in-status.enum';
import { IAthleteRepository } from '../../repository/IAthleteRepository.repository';
import { AthleteListItemView } from './athlete-list-item.view';

export type SearchAthletesInput = {
  competitionId: number;
  query?: string;
  teamId?: number;
};

@Injectable()
export class SearchAthletesUseCase {
  constructor(
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
    @Inject(ITeamRepository)
    private readonly teamRepository: ITeamRepository,
    @Inject(IWeighInRepository)
    private readonly weighInRepository: IWeighInRepository,
  ) {}

  async execute(input: SearchAthletesInput): Promise<AthleteListItemView[]> {
    const athletes = await this.athleteRepository.search({
      competitionId: input.competitionId,
      query: input.query,
      teamId: input.teamId,
    });

    const athleteIds = athletes
      .map((athlete) => athlete.id)
      .filter((id): id is number => id !== undefined);

    const [teams, weighIns] = await Promise.all([
      this.teamRepository.listByCompetitionId(input.competitionId),
      athleteIds.length
        ? this.weighInRepository.findByCompetitionIdAndAthleteIds(
            input.competitionId,
            athleteIds,
          )
        : Promise.resolve([]),
    ]);

    const teamNameById = new Map(
      teams.map((team) => [team.id as number, team.name]),
    );
    const weighInStatusByAthleteId = new Map(
      weighIns.map((weighIn) => [weighIn.athleteId, weighIn.status]),
    );

    return athletes.map((athlete) => ({
      ...athlete.toJSON(),
      teamName:
        athlete.teamId !== null ? teamNameById.get(athlete.teamId) ?? null : null,
      weighInStatus:
        weighInStatusByAthleteId.get(athlete.id as number) ??
        WeighInStatus.PENDING,
    }));
  }
}
