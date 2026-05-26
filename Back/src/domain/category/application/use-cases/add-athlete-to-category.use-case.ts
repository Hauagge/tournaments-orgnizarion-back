import { Inject, Injectable } from '@nestjs/common';
import { IAthleteRepository } from '@/domain/athlete/repository/IAthleteRepository.repository';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { IWeighInRepository } from '@/domain/weighin/repository/IWeighInRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { ICategoryRepository } from '../../repository/ICategoryRepository.repository';
import {
  CategoryEligibilityReason,
  CategoryEligibilityService,
} from '../services/category-eligibility.service';
import { AddAthleteToCategoryView } from './add-athlete-to-category.view';

export type AddAthleteToCategoryInput = {
  competitionId: number;
  categoryId: number;
  athleteId: number;
};

@Injectable()
export class AddAthleteToCategoryUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(ICategoryRepository)
    private readonly categoryRepository: ICategoryRepository,
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
    @Inject(IWeighInRepository)
    private readonly weighInRepository: IWeighInRepository,
    private readonly categoryEligibilityService: CategoryEligibilityService,
  ) {}

  async execute(
    input: AddAthleteToCategoryInput,
  ): Promise<AddAthleteToCategoryView> {
    const [competition, category, athlete] = await Promise.all([
      this.competitionRepository.findById(input.competitionId),
      this.categoryRepository.findById(input.categoryId),
      this.athleteRepository.findById(input.athleteId),
    ]);

    if (!competition) {
      throw new NotFoundError(
        `Competition with id ${input.competitionId} not found`,
      );
    }

    if (!category) {
      throw new NotFoundError(`Category with id ${input.categoryId} not found`);
    }

    if (category.competitionId !== input.competitionId) {
      throw new ValidationError(
        'Category does not belong to the selected competition',
      );
    }

    if (!athlete) {
      throw new NotFoundError(`Athlete with id ${input.athleteId} not found`);
    }

    if (athlete.competitionId !== input.competitionId) {
      throw new ValidationError(
        'Athlete does not belong to the same competition',
      );
    }

    const [categoryAthleteIds, assignedAthleteIds, weighIn] = await Promise.all(
      [
        this.categoryRepository.listAthleteIdsByCategoryId(input.categoryId),
        this.categoryRepository.listAthleteIdsByCompetitionId(
          input.competitionId,
        ),
        this.weighInRepository.findByCompetitionIdAndAthleteId(
          input.competitionId,
          input.athleteId,
        ),
      ],
    );

    if (categoryAthleteIds.includes(input.athleteId)) {
      throw new ValidationError('Athlete is already in this category', {
        reasons: ['Atleta já está vinculado a esta categoria'],
        reasonCodes: [CategoryEligibilityReason.ALREADY_ASSIGNED],
      });
    }

    const issues = this.categoryEligibilityService.evaluateForCategory({
      athlete,
      category,
      weighIn,
      alreadyAssignedToAnotherCategory:
        assignedAthleteIds.includes(input.athleteId) &&
        !categoryAthleteIds.includes(input.athleteId),
    });

    if (issues.length > 0) {
      throw new ValidationError(
        'Atleta não pode ser adicionado a esta categoria.',
        {
          reasons: issues.map((issue) => issue.detail),
          reasonCodes: issues.map((issue) => issue.reason),
        },
      );
    }

    await this.categoryRepository.addAthletesToCategories([
      {
        categoryId: input.categoryId,
        athleteIds: [input.athleteId],
      },
    ]);

    return {
      competitionId: input.competitionId,
      categoryId: input.categoryId,
      categoryName: category.name,
      athleteId: input.athleteId,
      athleteName: athlete.fullName,
    };
  }
}
