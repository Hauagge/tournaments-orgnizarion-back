import { Inject, Injectable } from '@nestjs/common';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { Category } from '../../domain/entities/category.entity';
import { ICategoryRepository } from '../../repository/ICategoryRepository.repository';

@Injectable()
export class ListCategoriesUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(ICategoryRepository)
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async execute(competitionId: number): Promise<Category[]> {
    const competition = await this.competitionRepository.findById(competitionId);

    if (!competition) {
      throw new NotFoundError(`Competition with id ${competitionId} not found`);
    }

    return this.categoryRepository.listByCompetitionId(competitionId);
  }
}
