import { Inject, Injectable } from '@nestjs/common';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { IKeyGroupRepository, KeyGroupListItemView } from '../../repository/IKeyGroupRepository.repository';

@Injectable()
export class ListKeyGroupsUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(IKeyGroupRepository)
    private readonly keyGroupRepository: IKeyGroupRepository,
  ) {}

  async execute(input: {
    competitionId: number;
    categoryId?: number;
  }): Promise<KeyGroupListItemView[]> {
    const competition = await this.competitionRepository.findById(input.competitionId);

    if (!competition) {
      throw new NotFoundError(`Competition with id ${input.competitionId} not found`);
    }

    return this.keyGroupRepository.listByCompetitionId(input);
  }
}
