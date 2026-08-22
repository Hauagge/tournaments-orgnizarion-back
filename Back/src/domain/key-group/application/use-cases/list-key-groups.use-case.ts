import { Inject, Injectable } from '@nestjs/common';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { IKeyGroupRepository, KeyGroupListItemView } from '../../repository/IKeyGroupRepository.repository';
import { KeyGroupBracketFormat } from '../../domain/value-objects/key-group-bracket-format.enum';

export type KeyGroupListItemWithBracketView = KeyGroupListItemView & {
  bracketFormat: KeyGroupBracketFormat;
};

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
  }): Promise<KeyGroupListItemWithBracketView[]> {
    const competition = await this.competitionRepository.findById(input.competitionId);

    if (!competition) {
      throw new NotFoundError(`Competition with id ${input.competitionId} not found`);
    }

    const groups = await this.keyGroupRepository.listByCompetitionId(input);

    return groups.map((group) => ({
      ...group,
      bracketFormat: this.detectFormat(group.membersCount),
    }));
  }

  private detectFormat(membersCount: number): KeyGroupBracketFormat {
    if (membersCount === 2) {
      return KeyGroupBracketFormat.BEST_OF_THREE;
    }

    if (membersCount === 4) {
      return KeyGroupBracketFormat.OLYMPIC;
    }

    return KeyGroupBracketFormat.ROUND_ROBIN;
  }
}
