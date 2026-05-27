import { Inject, Injectable } from '@nestjs/common';
import { IAreaRepository } from '@/domain/area/repository/IAreaRepository.repository';
import { IAthleteRepository } from '@/domain/athlete/repository/IAthleteRepository.repository';
import { ICategoryRepository } from '@/domain/category/repository/ICategoryRepository.repository';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { IFightRepository } from '@/domain/fight/repository/IFightRepository.repository';
import { IKeyGroupRepository } from '@/domain/key-group/repository/IKeyGroupRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import {
  FightsByAreaReportFightView,
  FightsByAreaReportSectionView,
  FightsByAreaReportView,
} from '../dtos/fights-by-area-report.dto';

@Injectable()
export class FightsByAreaReportDataBuilderService {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(IAreaRepository)
    private readonly areaRepository: IAreaRepository,
    @Inject(IFightRepository)
    private readonly fightRepository: IFightRepository,
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
    @Inject(ICategoryRepository)
    private readonly categoryRepository: ICategoryRepository,
    @Inject(IKeyGroupRepository)
    private readonly keyGroupRepository: IKeyGroupRepository,
  ) {}

  async build(competitionId: number): Promise<FightsByAreaReportView> {
    const competition =
      await this.competitionRepository.findById(competitionId);

    if (!competition) {
      throw new NotFoundError(`Competition with id ${competitionId} not found`);
    }

    const [areas, fights, categories, keyGroupReports] = await Promise.all([
      this.areaRepository.listByCompetitionId(competitionId),
      this.fightRepository.listByCompetitionId({ competitionId }),
      this.categoryRepository.listByCompetitionId(competitionId),
      this.keyGroupRepository.listReportByCompetitionId({ competitionId }),
    ]);

    const competitionFights = fights.filter(
      (fight) => fight.competitionId === competitionId,
    );

    if (competitionFights.length === 0) {
      throw new ValidationError(
        'Nenhuma luta encontrada para esta competição.',
      );
    }

    const athleteIds = Array.from(
      new Set(
        competitionFights.flatMap((fight) => [
          fight.athleteAId,
          fight.athleteBId,
        ]),
      ),
    ).filter((id): id is number => id !== null);
    const athletes = await this.athleteRepository.findByIds(athleteIds);

    const athleteById = new Map(
      athletes.map((athlete) => [athlete.id as number, athlete]),
    );
    const categoryById = new Map(
      categories.map((category) => [category.id as number, category]),
    );
    const reportFightById = this.buildReportFightById(keyGroupReports);

    const sortedAreas = areas
      .slice()
      .sort(
        (left, right) =>
          left.order - right.order ||
          (left.id as number) - (right.id as number),
      );

    const fightsByAreaId = new Map<number, typeof competitionFights>();
    const unassignedFights: typeof competitionFights = [];

    for (const fight of competitionFights) {
      if (
        fight.areaId === null ||
        !sortedAreas.some((area) => area.id === fight.areaId)
      ) {
        unassignedFights.push(fight);
        continue;
      }

      const list = fightsByAreaId.get(fight.areaId) ?? [];
      list.push(fight);
      fightsByAreaId.set(fight.areaId, list);
    }

    const sections: FightsByAreaReportSectionView[] = sortedAreas.map(
      (area) => ({
        areaName: area.name || `Área ${area.order}`,
        areaOrder: area.order,
        fights: this.sortFights(
          fightsByAreaId.get(area.id as number) ?? [],
        ).map((fight) =>
          this.mapFight({
            fight,
            athleteById,
            categoryById,
            reportFightById,
          }),
        ),
      }),
    );

    return {
      competitionName: competition.name,
      exportedAt: new Date().toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }),
      sections,
      unassignedSection: unassignedFights.length
        ? {
            areaName: 'Lutas sem área definida',
            areaOrder: null,
            fights: this.sortFights(unassignedFights).map((fight) =>
              this.mapFight({
                fight,
                athleteById,
                categoryById,
                reportFightById,
              }),
            ),
          }
        : null,
    };
  }

  private sortFights<T extends { orderIndex: number; id?: number }>(
    fights: T[],
  ): T[] {
    return fights
      .slice()
      .sort(
        (left, right) =>
          left.orderIndex - right.orderIndex ||
          (left.id ?? 0) - (right.id ?? 0),
      );
  }

  private buildReportFightById(
    groups: Awaited<
      ReturnType<IKeyGroupRepository['listReportByCompetitionId']>
    >,
  ) {
    const reportFightById = new Map<
      number,
      {
        categoryName: string | null;
      }
    >();

    for (const group of groups) {
      for (const fight of group.fights) {
        reportFightById.set(fight.id, {
          categoryName: group.categoryName,
        });
      }
    }

    return reportFightById;
  }

  private mapFight(input: {
    fight: Awaited<ReturnType<IFightRepository['listByCompetitionId']>>[number];
    athleteById: Map<
      number,
      Awaited<ReturnType<IAthleteRepository['findByIds']>>[number]
    >;
    categoryById: Map<
      number,
      Awaited<ReturnType<ICategoryRepository['listByCompetitionId']>>[number]
    >;
    reportFightById: Map<
      number,
      {
        categoryName: string | null;
      }
    >;
  }): FightsByAreaReportFightView {
    const athleteA =
      input.fight.athleteAId !== null
        ? input.athleteById.get(input.fight.athleteAId)
        : undefined;
    const athleteB =
      input.fight.athleteBId !== null
        ? input.athleteById.get(input.fight.athleteBId)
        : undefined;
    const reportFight = input.reportFightById.get(input.fight.id as number);

    return {
      categoryName:
        reportFight?.categoryName ??
        (input.fight.categoryId !== null
          ? input.categoryById.get(input.fight.categoryId)?.name
          : undefined) ??
        'Categoria não informada',
      athleteAName:
        athleteA?.fullName ??
        (input.fight.athleteAId !== null
          ? `Atleta ${input.fight.athleteAId}`
          : 'Atleta A definir'),
      athleteBName:
        athleteB?.fullName ??
        (input.fight.athleteBId !== null
          ? `Atleta ${input.fight.athleteBId}`
          : 'Atleta B definir'),
    };
  }
}
