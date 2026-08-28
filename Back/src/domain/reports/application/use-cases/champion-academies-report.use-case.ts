import { Inject, Injectable } from '@nestjs/common';
import { IAcademyRepository } from '@/domain/academy/repository/IAcademyRepository.repository';
import { IAthleteRepository } from '@/domain/athlete/repository/IAthleteRepository.repository';
import { Category } from '@/domain/category/domain/entities/category.entity';
import { ICategoryRepository } from '@/domain/category/repository/ICategoryRepository.repository';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import {
  ChampionAcademiesReportView,
  ChampionAcademyRankingView,
  ChampionAthleteView,
} from './champion-academies-report.view';

export type ChampionAcademiesReportInput = {
  competitionId: number;
  belt?: string;
  ageDivision?: string;
  categoryId?: number;
};

const UNKNOWN_ACADEMY_NAME = 'Academia nao informada';

@Injectable()
export class ChampionAcademiesReportUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(ICategoryRepository)
    private readonly categoryRepository: ICategoryRepository,
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
    @Inject(IAcademyRepository)
    private readonly academyRepository: IAcademyRepository,
  ) {}

  async execute(
    input: ChampionAcademiesReportInput,
  ): Promise<ChampionAcademiesReportView> {
    const competition = await this.competitionRepository.findById(
      input.competitionId,
    );

    if (!competition) {
      throw new NotFoundError(
        `Competition with id ${input.competitionId} not found`,
      );
    }

    const categories = await this.categoryRepository.listByCompetitionId(
      input.competitionId,
    );
    const championCategories = categories.filter((category) =>
      this.matchesFilters(category, input),
    );

    if (championCategories.length === 0) {
      return {
        competitionId: input.competitionId,
        totalChampionAthletes: 0,
        academies: [],
      };
    }

    const [athletes, academies] = await Promise.all([
      this.athleteRepository.findByIds(
        Array.from(
          new Set(
            championCategories.map(
              (category) => category.championAthleteId as number,
            ),
          ),
        ),
      ),
      this.academyRepository.listByCompetitionId(input.competitionId),
    ]);

    const athletesById = new Map(
      athletes.map((athlete) => [athlete.id as number, athlete]),
    );
    const academyNamesById = new Map(
      academies.map((academy) => [academy.id as number, academy.name]),
    );

    const championsByAcademy = new Map<
      string,
      { academyId: number | null; academyName: string; champions: ChampionAthleteView[] }
    >();

    for (const category of championCategories) {
      const athlete = athletesById.get(category.championAthleteId as number);

      if (!athlete) {
        continue;
      }

      const academyId = athlete.academyId ?? null;
      const key = academyId === null ? 'none' : String(academyId);
      const group = championsByAcademy.get(key) ?? {
        academyId,
        academyName:
          (academyId === null
            ? null
            : academyNamesById.get(academyId)) ?? UNKNOWN_ACADEMY_NAME,
        champions: [],
      };

      group.champions.push({
        athleteId: athlete.id as number,
        athleteName: athlete.fullName,
        categoryId: category.id as number,
        categoryName: category.name,
        belt: category.belt || athlete.belt || null,
        ageDivision: this.buildAgeDivision(category),
        weightDivision: this.buildWeightDivision(category),
      });
      championsByAcademy.set(key, group);
    }

    const ranking: ChampionAcademyRankingView[] = Array.from(
      championsByAcademy.values(),
    )
      .map((group) => ({
        position: 0,
        academyId: group.academyId,
        academyName: group.academyName,
        totalChampions: group.champions.length,
        champions: group.champions.sort((left, right) =>
          left.athleteName.localeCompare(right.athleteName),
        ),
      }))
      .sort(
        (left, right) =>
          right.totalChampions - left.totalChampions ||
          left.academyName.localeCompare(right.academyName),
      )
      .map((group, index) => ({ ...group, position: index + 1 }));

    return {
      competitionId: input.competitionId,
      totalChampionAthletes: ranking.reduce(
        (total, academy) => total + academy.totalChampions,
        0,
      ),
      academies: ranking,
    };
  }

  private matchesFilters(
    category: Category,
    input: ChampionAcademiesReportInput,
  ): boolean {
    if (category.championAthleteId === null) {
      return false;
    }

    if (
      input.categoryId !== undefined &&
      (category.id as number) !== input.categoryId
    ) {
      return false;
    }

    if (
      input.belt !== undefined &&
      category.belt.trim().toLocaleLowerCase() !==
        input.belt.trim().toLocaleLowerCase()
    ) {
      return false;
    }

    if (
      input.ageDivision !== undefined &&
      (this.buildAgeDivision(category) ?? '').toLocaleLowerCase() !==
        input.ageDivision.trim().toLocaleLowerCase()
    ) {
      return false;
    }

    return true;
  }

  private buildAgeDivision(category: Category): string | null {
    if (category.ageMin !== null && category.ageMax !== null) {
      return `${category.ageMin}-${category.ageMax} anos`;
    }

    if (category.ageMin !== null) {
      return `${category.ageMin}+ anos`;
    }

    if (category.ageMax !== null) {
      return `ate ${category.ageMax} anos`;
    }

    return null;
  }

  private buildWeightDivision(category: Category): string | null {
    const min = category.weightMinGrams;
    const max = category.weightMaxGrams;

    if (min !== null && max !== null) {
      return `${this.formatKilograms(min)} - ${this.formatKilograms(max)}`;
    }

    if (max !== null) {
      return `ate ${this.formatKilograms(max)}`;
    }

    if (min !== null) {
      return `acima de ${this.formatKilograms(min)}`;
    }

    return null;
  }

  private formatKilograms(grams: number): string {
    return `${(grams / 1000).toFixed(1).replace('.', ',')} kg`;
  }
}
