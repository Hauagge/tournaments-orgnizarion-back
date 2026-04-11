import { Inject, Injectable } from '@nestjs/common';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { Category } from '../../domain/entities/category.entity';
import { ICategoryRepository } from '../../repository/ICategoryRepository.repository';

export type CreateCategoryInput = {
  competitionId: number;
  name: string;
  belt: string;
  ageMin?: number | null;
  ageMax?: number | null;
  weightMinGrams?: number | null;
  weightMaxGrams?: number | null;
};

@Injectable()
export class CreateCategoryUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(ICategoryRepository)
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async execute(input: CreateCategoryInput): Promise<Category> {
    const competition = await this.competitionRepository.findById(
      input.competitionId,
    );

    if (!competition) {
      throw new NotFoundError(
        `Competition with id ${input.competitionId} not found`,
      );
    }

    if (
      input.ageMin &&
      input.ageMax &&
      input.ageMin &&
      input.ageMax &&
      input.ageMin > input.ageMax
    ) {
      throw new ValidationError('ageMin cannot be greater than ageMax');
    }

    if (
      input.weightMinGrams &&
      input.weightMaxGrams &&
      input.weightMinGrams &&
      input.weightMaxGrams &&
      input.weightMinGrams > input.weightMaxGrams
    ) {
      throw new ValidationError(
        'weightMinGrams cannot be greater than weightMaxGrams',
      );
    }

    const category = Category.create({
      competitionId: input.competitionId,
      name: input.name,
      belt: input.belt,
      ageMin: input.ageMin ?? null,
      ageMax: input.ageMax ?? null,
      weightMinGrams: input.weightMinGrams ?? null,
      weightMaxGrams: input.weightMaxGrams ?? null,
      totalAthletes: 0,
    });

    return this.categoryRepository.create(category);
  }
}
