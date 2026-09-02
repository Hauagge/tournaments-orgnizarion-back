import { Inject, Injectable } from '@nestjs/common';
import { IAcademyRepository } from '@/domain/academy/repository/IAcademyRepository.repository';
import { IAthleteRepository } from '@/domain/athlete/repository/IAthleteRepository.repository';
import { Category } from '@/domain/category/domain/entities/category.entity';
import { ICategoryRepository } from '@/domain/category/repository/ICategoryRepository.repository';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { CategoryPodiumService } from '@/domain/fight/application/services/category-podium.service';
import { FightEntity } from '@/domain/fight/domain/entities/fight.entity';
import { IFightRepository } from '@/domain/fight/repository/IFightRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import {
  CategoryResultView,
  CompetitionResultsView,
  ResultAthleteView,
} from './competition-results.view';

export type CompetitionResultsInput = {
  competitionId: number;
  belt?: string;
  onlyDecided?: boolean;
};

@Injectable()
export class CompetitionResultsUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(ICategoryRepository)
    private readonly categoryRepository: ICategoryRepository,
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
    @Inject(IAcademyRepository)
    private readonly academyRepository: IAcademyRepository,
    @Inject(IFightRepository)
    private readonly fightRepository: IFightRepository,
    private readonly categoryPodiumService: CategoryPodiumService,
  ) {}

  async execute(
    input: CompetitionResultsInput,
  ): Promise<CompetitionResultsView> {
    const competition = await this.competitionRepository.findById(
      input.competitionId,
    );

    if (!competition) {
      throw new NotFoundError(
        `Competition with id ${input.competitionId} not found`,
      );
    }

    const [categories, fights] = await Promise.all([
      this.categoryRepository.listByCompetitionId(input.competitionId),
      this.fightRepository.listByCompetitionId({
        competitionId: input.competitionId,
      }),
    ]);

    const fightsByCategoryId = new Map<number, FightEntity[]>();
    for (const fight of fights) {
      if (fight.categoryId === null) {
        continue;
      }
      fightsByCategoryId.set(fight.categoryId, [
        ...(fightsByCategoryId.get(fight.categoryId) ?? []),
        fight,
      ]);
    }

    // Categoria sem luta nao tem podio; nem entra na listagem.
    const podiums = categories
      .filter((category) => this.matchesBelt(category, input.belt))
      .map((category) => ({
        category,
        podiums: this.categoryPodiumService.resolveAll(
          fightsByCategoryId.get(category.id as number) ?? [],
        ),
      }))
      .filter(({ podiums, category }) => {
        if ((fightsByCategoryId.get(category.id as number) ?? []).length === 0) {
          return false;
        }
        return input.onlyDecided ? podiums.main.decided : true;
      });

    const athleteIds = Array.from(
      new Set(
        podiums
          .flatMap(({ podiums }) => [
            podiums.main.firstAthleteId,
            podiums.main.secondAthleteId,
            ...podiums.main.thirdAthleteIds,
            podiums.secondary?.firstAthleteId ?? null,
            podiums.secondary?.secondAthleteId ?? null,
            ...(podiums.secondary?.thirdAthleteIds ?? []),
          ])
          .filter((athleteId): athleteId is number => athleteId !== null),
      ),
    );

    const [athletes, academies] = await Promise.all([
      athleteIds.length > 0
        ? this.athleteRepository.findByIds(athleteIds)
        : Promise.resolve([]),
      this.academyRepository.listByCompetitionId(input.competitionId),
    ]);

    const athletesById = new Map(
      athletes.map((athlete) => [athlete.id as number, athlete]),
    );
    const academyNamesById = new Map(
      academies.map((academy) => [academy.id as number, academy.name]),
    );

    const toAthleteView = (
      athleteId: number | null,
    ): ResultAthleteView | null => {
      if (athleteId === null) {
        return null;
      }

      const athlete = athletesById.get(athleteId);

      if (!athlete) {
        return null;
      }

      const academyId = athlete.academyId ?? null;

      return {
        athleteId,
        athleteName: athlete.fullName,
        academyId,
        academyName:
          academyId === null
            ? null
            : (academyNamesById.get(academyId) ?? null),
      };
    };

    const categoryResults: CategoryResultView[] = podiums
      .map(({ category, podiums }) => ({
        categoryId: category.id as number,
        categoryName: category.name,
        belt: category.belt || null,
        ageDivision: this.buildAgeDivision(category),
        weightDivision: this.buildWeightDivision(category),
        totalAthletes: category.totalAthletes ?? 0,
        decided: podiums.main.decided,
        first: toAthleteView(podiums.main.firstAthleteId),
        second: toAthleteView(podiums.main.secondAthleteId),
        thirds: podiums.main.thirdAthleteIds
          .map(toAthleteView)
          .filter((athlete): athlete is ResultAthleteView => athlete !== null),
        secondarySeries: podiums.secondary
          ? {
              label: 'Série Prata',
              countsForAcademyRanking: false,
              first: toAthleteView(podiums.secondary.firstAthleteId),
              second: toAthleteView(podiums.secondary.secondAthleteId),
              thirds: podiums.secondary.thirdAthleteIds
                .map(toAthleteView)
                .filter(
                  (athlete): athlete is ResultAthleteView => athlete !== null,
                ),
            }
          : null,
      }))
      .sort((left, right) => left.categoryName.localeCompare(right.categoryName));

    return {
      competitionId: input.competitionId,
      totalCategories: categoryResults.length,
      decidedCategories: categoryResults.filter((item) => item.decided).length,
      categories: categoryResults,
    };
  }

  private matchesBelt(category: Category, belt?: string): boolean {
    if (belt === undefined) {
      return true;
    }

    return (
      category.belt.trim().toLocaleLowerCase() ===
      belt.trim().toLocaleLowerCase()
    );
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
