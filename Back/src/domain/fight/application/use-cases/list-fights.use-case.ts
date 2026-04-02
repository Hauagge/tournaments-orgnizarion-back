import { Inject, Injectable } from '@nestjs/common';
import { IAthleteRepository } from '@/domain/athlete/repository/IAthleteRepository.repository';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { FightStatus } from '../../domain/value-objects/fight-status.enum';
import { IFightRepository } from '../../repository/IFightRepository.repository';
import { FightListItemView } from './fight-list-item.view';

@Injectable()
export class ListFightsUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(IFightRepository)
    private readonly fightRepository: IFightRepository,
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
  ) {}

  async execute(input: {
    competitionId: number;
    status?: FightStatus;
  }): Promise<FightListItemView[]> {
    const competition = await this.competitionRepository.findById(input.competitionId);

    if (!competition) {
      throw new NotFoundError(`Competition with id ${input.competitionId} not found`);
    }

    const fights = await this.fightRepository.listByCompetitionId(input);
    const athleteIds = Array.from(
      new Set(fights.flatMap((fight) => [fight.athleteAId, fight.athleteBId])),
    );
    const athletes = await this.athleteRepository.findByIds(athleteIds);
    const athleteNamesById = new Map(
      athletes.map((athlete) => [athlete.id as number, athlete.fullName]),
    );

    return fights.map((fight) => ({
      id: fight.id,
      competitionId: fight.competitionId,
      categoryId: fight.categoryId,
      keyGroupId: fight.keyGroupId,
      areaId: fight.areaId,
      status: fight.status,
      athleteAId: fight.athleteAId,
      athleteAName: athleteNamesById.get(fight.athleteAId) ?? null,
      athleteBId: fight.athleteBId,
      athleteBName: athleteNamesById.get(fight.athleteBId) ?? null,
      winnerAthleteId: fight.winnerAthleteId,
      winType: fight.winType,
      startedAt: fight.startedAt,
      finishedAt: fight.finishedAt,
      orderIndex: fight.orderIndex,
    }));
  }
}
