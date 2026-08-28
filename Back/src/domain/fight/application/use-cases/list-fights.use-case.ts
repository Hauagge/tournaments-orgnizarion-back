import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { IAcademyRepository } from '@/domain/academy/repository/IAcademyRepository.repository';
import { IAthleteRepository } from '@/domain/athlete/repository/IAthleteRepository.repository';
import { IUserCompetitionRepository } from '@/domain/auth/repository/IUserCompetitionRepository.repository';
import { ICategoryRepository } from '@/domain/category/repository/ICategoryRepository.repository';
import { IKeyGroupRepository } from '@/domain/key-group/repository/IKeyGroupRepository.repository';
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
    @Inject(IUserCompetitionRepository)
    private readonly userCompetitionRepository: IUserCompetitionRepository,
    @Inject(IFightRepository)
    private readonly fightRepository: IFightRepository,
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
    @Inject(IAcademyRepository)
    private readonly academyRepository: IAcademyRepository,
    @Inject(ICategoryRepository)
    private readonly categoryRepository: ICategoryRepository,
    @Inject(IKeyGroupRepository)
    private readonly keyGroupRepository: IKeyGroupRepository,
  ) {}

  async execute(input: {
    currentUserId: number;
    competitionId: number;
    status?: FightStatus;
    categoryId?: number;
    round?: number;
    areaId?: number;
    athleteName?: string;
  }): Promise<FightListItemView[]> {
    const competition = await this.competitionRepository.findById(
      input.competitionId,
    );

    if (!competition) {
      throw new NotFoundError(
        `Competition with id ${input.competitionId} not found`,
      );
    }

    const access =
      await this.userCompetitionRepository.findByUserIdAndCompetitionId({
        userId: input.currentUserId,
        competitionId: input.competitionId,
      });

    if (!access) {
      throw new ForbiddenException(
        'Usuario autenticado nao possui acesso a esta competicao',
      );
    }

    const [fights, categories, keyGroups] = await Promise.all([
      this.fightRepository.listByCompetitionId(input),
      this.categoryRepository.listByCompetitionId(input.competitionId),
      this.keyGroupRepository.listByCompetitionId({
        competitionId: input.competitionId,
      }),
    ]);
    const categoryNamesById = new Map(
      categories.map((category) => [category.id as number, category.name]),
    );
    const keyGroupNamesById = new Map(
      keyGroups.map((keyGroup) => [keyGroup.id, keyGroup.name]),
    );
    const athleteIds = Array.from(
      new Set(
        fights.flatMap((fight) =>
          [fight.athleteAId, fight.athleteBId, fight.winnerId].filter(
            (athleteId): athleteId is number => athleteId !== null,
          ),
        ),
      ),
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
      categoryName:
        fight.categoryId !== null
          ? (categoryNamesById.get(fight.categoryId) ?? null)
          : null,
      keyGroupId: fight.keyGroupId,
      keyGroupName:
        fight.keyGroupId !== null
          ? (keyGroupNamesById.get(fight.keyGroupId) ?? null)
          : null,
      areaId: fight.areaId,
      areaName: fight.areaName,
      status: fight.status,
      round: fight.round,
      order: fight.order,
      athleteAId: fight.athleteAId,
      athleteAName:
        fight.athleteAId !== null
          ? (athleteNamesById.get(fight.athleteAId) ?? null)
          : null,
      academyAName:
        fight.athleteAId !== null
          ? (athleteAcademyNamesById.get(fight.athleteAId) ?? null)
          : null,
      athleteBId: fight.athleteBId,
      athleteBName:
        fight.athleteBId !== null
          ? (athleteNamesById.get(fight.athleteBId) ?? null)
          : null,
      academyBName:
        fight.athleteBId !== null
          ? (athleteAcademyNamesById.get(fight.athleteBId) ?? null)
          : null,
      winnerId: fight.winnerId,
      winnerName:
        fight.winnerId !== null
          ? (athleteNamesById.get(fight.winnerId) ?? null)
          : null,
      loserId: fight.loserId,
      nextFightId: fight.nextFightId,
      nextFightSlot: fight.nextFightSlot,
      createdManually: fight.createdManually,
      isWo: fight.isWo,
      winType: fight.winType,
      startedAt: fight.startedAt,
      finishedAt: fight.finishedAt,
      orderIndex: fight.order,
    }));
  }
}
