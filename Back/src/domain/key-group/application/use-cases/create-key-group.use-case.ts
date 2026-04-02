import { Inject, Injectable } from '@nestjs/common';
import { ICategoryRepository } from '@/domain/category/repository/ICategoryRepository.repository';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { KeyGroup } from '../../domain/entities/key-group.entity';
import { IKeyGroupRepository } from '../../repository/IKeyGroupRepository.repository';

export type CreateKeyGroupInput = {
  competitionId: number;
  categoryId?: number | null;
  name?: string | null;
};

@Injectable()
export class CreateKeyGroupUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(ICategoryRepository)
    private readonly categoryRepository: ICategoryRepository,
    @Inject(IKeyGroupRepository)
    private readonly keyGroupRepository: IKeyGroupRepository,
  ) {}

  async execute(input: CreateKeyGroupInput): Promise<KeyGroup> {
    const competition = await this.competitionRepository.findById(input.competitionId);

    if (!competition) {
      throw new NotFoundError(`Competition with id ${input.competitionId} not found`);
    }

    if (competition.mode !== CompetitionMode.KEYS) {
      throw new ValidationError('Key groups are only available for competitions in KEYS mode');
    }

    if (input.categoryId !== undefined && input.categoryId !== null) {
      const category = await this.categoryRepository.findById(input.categoryId);

      if (!category || category.competitionId !== input.competitionId) {
        throw new ValidationError('Category does not belong to the selected competition');
      }
    }

    return this.keyGroupRepository.create(
      KeyGroup.create({
        competitionId: input.competitionId,
        categoryId: input.categoryId ?? null,
        name: input.name ?? null,
      }),
    );
  }
}
