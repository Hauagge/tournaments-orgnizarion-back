import { Inject, Injectable } from '@nestjs/common';
import { IAcademyRepository } from '@/domain/academy/repository/IAcademyRepository.repository';
import { IAthleteRepository } from '@/domain/athlete/repository/IAthleteRepository.repository';
import { Category } from '@/domain/category/domain/entities/category.entity';
import { ICategoryRepository } from '@/domain/category/repository/ICategoryRepository.repository';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import {
  IKeyGroupRepository,
  KeyGroupListItemView,
} from '@/domain/key-group/repository/IKeyGroupRepository.repository';
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

type ChampionSource = {
  athleteId: number;
  keyGroup: KeyGroupListItemView | null;
  category: Category | null;
};

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
    @Inject(IKeyGroupRepository)
    private readonly keyGroupRepository: IKeyGroupRepository,
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

    const [categories, keyGroups] = await Promise.all([
      this.categoryRepository.listByCompetitionId(input.competitionId),
      this.keyGroupRepository.listByCompetitionId({
        competitionId: input.competitionId,
      }),
    ]);
    const categoriesById = new Map(
      categories.map((category) => [category.id as number, category]),
    );

    // Chaves decididas primeiro: em competicao por chaves a categoria pode nem
    // existir. A categoria so entra depois se nenhuma chave dela ja apareceu.
    const championKeyGroups = keyGroups.filter(
      (keyGroup) =>
        keyGroup.championAthleteId !== null &&
        this.matchesKeyGroupFilters(keyGroup, categoriesById, input),
    );
    const categoryIdsFromKeyGroups = new Set(
      championKeyGroups
        .map((keyGroup) => keyGroup.categoryId)
        .filter((categoryId): categoryId is number => categoryId !== null),
    );
    const championCategories = categories.filter(
      (category) =>
        !categoryIdsFromKeyGroups.has(category.id as number) &&
        this.matchesFilters(category, input),
    );

    const championSources: ChampionSource[] = [
      ...championKeyGroups.map((keyGroup) => ({
        athleteId: keyGroup.championAthleteId as number,
        keyGroup,
        category:
          keyGroup.categoryId !== null
            ? (categoriesById.get(keyGroup.categoryId) ?? null)
            : null,
      })),
      ...championCategories.map((category) => ({
        athleteId: category.championAthleteId as number,
        keyGroup: null,
        category,
      })),
    ];

    if (championSources.length === 0) {
      return {
        competitionId: input.competitionId,
        totalChampionAthletes: 0,
        academies: [],
      };
    }

    const [athletes, academies] = await Promise.all([
      this.athleteRepository.findByIds(
        Array.from(new Set(championSources.map((source) => source.athleteId))),
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

    for (const source of championSources) {
      const athlete = athletesById.get(source.athleteId);

      if (!athlete) {
        continue;
      }

      const category = source.category;

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
        categoryId: category?.id ?? null,
        categoryName: category?.name ?? null,
        keyGroupId: source.keyGroup?.id ?? null,
        keyGroupName:
          source.keyGroup === null
            ? null
            : (source.keyGroup.name ?? `Chave ${source.keyGroup.id}`),
        belt: category?.belt || athlete.belt || null,
        ageDivision: category ? this.buildAgeDivision(category) : null,
        weightDivision: category ? this.buildWeightDivision(category) : null,
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

  private matchesKeyGroupFilters(
    keyGroup: KeyGroupListItemView,
    categoriesById: Map<number, Category>,
    input: ChampionAcademiesReportInput,
  ): boolean {
    const category =
      keyGroup.categoryId !== null
        ? (categoriesById.get(keyGroup.categoryId) ?? null)
        : null;

    if (input.categoryId !== undefined) {
      return keyGroup.categoryId === input.categoryId;
    }

    // Chave sem categoria nao tem faixa nem divisao de idade para comparar.
    if (input.belt !== undefined || input.ageDivision !== undefined) {
      return category !== null && this.matchesFilters(category, input, false);
    }

    return true;
  }

  private matchesFilters(
    category: Category,
    input: ChampionAcademiesReportInput,
    requireChampion = true,
  ): boolean {
    if (requireChampion && category.championAthleteId === null) {
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
