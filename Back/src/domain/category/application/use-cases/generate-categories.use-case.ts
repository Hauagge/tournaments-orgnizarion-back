import { Inject, Injectable } from '@nestjs/common';
import { IAthleteRepository } from '@/domain/athlete/repository/IAthleteRepository.repository';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { Category } from '../../domain/entities/category.entity';
import { CategoryGenerationService } from '../services/category-generation.service';
import { ICategoryRepository } from '../../repository/ICategoryRepository.repository';

export type GenerateCategoriesInput = {
  competitionId: number;
};

@Injectable()
export class GenerateCategoriesUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
    @Inject(ICategoryRepository)
    private readonly categoryRepository: ICategoryRepository,
    private readonly categoryGenerationService: CategoryGenerationService,
  ) {}

  async execute(input: GenerateCategoriesInput): Promise<Category[]> {
    const competition = await this.competitionRepository.findById(
      input.competitionId,
    );

    if (!competition) {
      throw new NotFoundError(
        `Competition with id ${input.competitionId} not found`,
      );
    }

    const athletes = await this.athleteRepository.search({
      competitionId: input.competitionId,
    });

    const assignments = this.categoryGenerationService.generate(
      input.competitionId,
      competition.mode,
      athletes,
    );

    return this.categoryRepository.replaceCompetitionCategories({
      competitionId: input.competitionId,
      assignments,
    });
  }
}
