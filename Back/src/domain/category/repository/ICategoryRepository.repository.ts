import { Category } from '../domain/entities/category.entity';

export type CategoryAssignment = {
  category: Category;
  athleteIds: number[];
};

export abstract class ICategoryRepository {
  abstract create(category: Category): Promise<Category>;
  abstract replaceCompetitionCategories(input: {
    competitionId: number;
    assignments: CategoryAssignment[];
  }): Promise<Category[]>;
  abstract listByCompetitionId(competitionId: number): Promise<Category[]>;
  abstract findById(id: number): Promise<Category | null>;
  abstract listAthleteIdsByCategoryId(categoryId: number): Promise<number[]>;
}
