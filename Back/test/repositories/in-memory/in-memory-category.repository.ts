import { Category } from '../../../src/domain/category/domain/entities/category.entity';
import {
  CategoryAssignment,
  CategoryAthleteAddition,
  ICategoryRepository,
} from '../../../src/domain/category/repository/ICategoryRepository.repository';
import { makeCategory } from '../../factories';

type CategoryAthleteLink = {
  categoryId: number;
  athleteId: number;
};

export class InMemoryCategoryRepository implements ICategoryRepository {
  private categories: Category[] = [];
  private categoryAthletes: CategoryAthleteLink[] = [];
  private nextId = 1;

  constructor(
    seedCategories: Category[] = [],
    seedLinks: CategoryAthleteLink[] = [],
  ) {
    this.setCategories(seedCategories);
    this.setCategoryAthletes(seedLinks);
  }

  setCategories(categories: Category[]) {
    this.categories = [...categories];
    this.nextId =
      categories.reduce((max, category) => Math.max(max, category.id ?? 0), 0) +
      1;
  }

  setCategoryAthletes(links: CategoryAthleteLink[]) {
    this.categoryAthletes = [...links];
  }

  async create(category: Category): Promise<Category> {
    const createdCategory = makeCategory({
      ...category.toJSON(),
      id: this.nextId++,
    });
    this.categories.push(createdCategory);
    return createdCategory;
  }

  async replaceCompetitionCategories(input: {
    competitionId: number;
    assignments: CategoryAssignment[];
  }): Promise<Category[]> {
    const previousCategoryIds = new Set(
      this.categories
        .filter((category) => category.competitionId === input.competitionId)
        .map((category) => category.id as number),
    );

    this.categories = this.categories.filter(
      (category) => category.competitionId !== input.competitionId,
    );
    this.categoryAthletes = this.categoryAthletes.filter(
      (link) => !previousCategoryIds.has(link.categoryId),
    );

    const createdCategories: Category[] = [];

    for (const assignment of input.assignments) {
      const category = makeCategory({
        ...assignment.category.toJSON(),
        id: this.nextId++,
      });
      createdCategories.push(category);
      this.categories.push(category);
      this.categoryAthletes.push(
        ...assignment.athleteIds.map((athleteId) => ({
          categoryId: category.id as number,
          athleteId,
        })),
      );
    }

    return createdCategories;
  }

  async listByCompetitionId(competitionId: number): Promise<Category[]> {
    return this.categories.filter(
      (category) => category.competitionId === competitionId,
    );
  }

  async findById(id: number): Promise<Category | null> {
    return this.categories.find((category) => category.id === id) ?? null;
  }

  async update(category: Category): Promise<Category> {
    this.categories = this.categories.map((item) =>
      item.id === category.id ? category : item,
    );
    return category;
  }

  async listAthleteIdsByCategoryId(categoryId: number): Promise<number[]> {
    return this.categoryAthletes
      .filter((link) => link.categoryId === categoryId)
      .map((link) => link.athleteId)
      .sort((left, right) => left - right);
  }

  async listAthleteIdsByCompetitionId(
    competitionId: number,
  ): Promise<number[]> {
    const categoryIds = new Set(
      this.categories
        .filter((category) => category.competitionId === competitionId)
        .map((category) => category.id as number),
    );

    return this.categoryAthletes
      .filter((link) => categoryIds.has(link.categoryId))
      .map((link) => link.athleteId)
      .sort((left, right) => left - right);
  }

  async addAthletesToCategories(
    additions: CategoryAthleteAddition[],
  ): Promise<void> {
    for (const addition of additions) {
      const category = this.categories.find(
        (item) => item.id === addition.categoryId,
      );

      if (!category) {
        continue;
      }

      for (const athleteId of addition.athleteIds) {
        const exists = this.categoryAthletes.some(
          (link) =>
            link.categoryId === addition.categoryId &&
            link.athleteId === athleteId,
        );

        if (!exists) {
          this.categoryAthletes.push({
            categoryId: addition.categoryId,
            athleteId,
          });
          this.categories = this.categories.map((item) =>
            item.id === category.id
              ? makeCategory({
                  ...item.toJSON(),
                  totalAthletes: item.totalAthletes + 1,
                })
              : item,
          );
        }
      }
    }
  }
}
