import { Inject, Injectable } from '@nestjs/common';
import { IAcademyRepository } from '@/domain/academy/repository/IAcademyRepository.repository';
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
    @Inject(IAcademyRepository)
    private readonly academyRepository: IAcademyRepository,
  ) {}

  async execute(input: {
    competitionId: number;
    status?: FightStatus;
  }): Promise<FightListItemView[]> {
    const competition = await this.competitionRepository.findById(
      input.competitionId,
    );

    if (!competition) {
      throw new NotFoundError(
        `Competition with id ${input.competitionId} not found`,
      );
    }

    const fights = await this.fightRepository.listByCompetitionId(input);
    const athleteIds = Array.from(
      new Set(fights.flatMap((fight) => [fight.athleteAId, fight.athleteBId])),
    );
    const athletes = await this.athleteRepository.findByIds(athleteIds);
    const academyIds = Array.from(
      new Set(
        athletes
          .map((athlete) => athlete.academyId)
          .filter((academyId): academyId is number => academyId !== null),
      ),
    );
    const academies = await Promise.all(
      academyIds.map((academyId) => this.academyRepository.findById(academyId)),
    );
    const athleteNamesById = new Map(
      athletes.map((athlete) => [athlete.id as number, athlete.fullName]),
    );
    const athleteAcademyNamesById = new Map(
      athletes.map((athlete) => {
        const academyName =
          athlete.academyId !== null
            ? (academies.find((academy) => academy?.id === athlete.academyId)
                ?.name ?? null)
            : null;

        return [athlete.id as number, academyName];
      }),
    );

    return fights.map((fight) => ({
      id: fight.id,
      competitionId: fight.competitionId,
      categoryId: fight.categoryId,
      keyGroupId: fight.keyGroupId,
      areaId: fight.areaId,
      areaName: fight.areaName,
      status: fight.status,
      athleteAId: fight.athleteAId,
      athleteAName: athleteNamesById.get(fight.athleteAId) ?? null,
      academyAName: athleteAcademyNamesById.get(fight.athleteAId) ?? null,
      athleteBId: fight.athleteBId,
      athleteBName: athleteNamesById.get(fight.athleteBId) ?? null,
      academyBName: athleteAcademyNamesById.get(fight.athleteBId) ?? null,
      winnerAthleteId: fight.winnerAthleteId,
      winnerAthleteName:
        fight.winnerAthleteId !== null
          ? (athleteNamesById.get(fight.winnerAthleteId) ?? null)
          : null,
      winType: fight.winType,
      startedAt: fight.startedAt,
      finishedAt: fight.finishedAt,
      orderIndex: fight.orderIndex,
    }));
  }
}
