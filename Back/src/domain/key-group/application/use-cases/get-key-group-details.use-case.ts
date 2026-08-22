import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { IKeyGroupRepository, KeyGroupDetailsView } from '../../repository/IKeyGroupRepository.repository';
import {
  KeyGroupBracketView,
  KeyGroupBracketViewBuilderService,
} from '../services/key-group-bracket-view-builder.service';

export type KeyGroupDetailsWithBracketView = KeyGroupDetailsView &
  KeyGroupBracketView;

@Injectable()
export class GetKeyGroupDetailsUseCase {
  constructor(
    @Inject(IKeyGroupRepository)
    private readonly keyGroupRepository: IKeyGroupRepository,
    private readonly bracketViewBuilder: KeyGroupBracketViewBuilderService,
  ) {}

  async execute(id: number): Promise<KeyGroupDetailsWithBracketView> {
    const details = await this.keyGroupRepository.getDetails(id);

    if (!details) {
      throw new NotFoundError(`Key group with id ${id} not found`);
    }

    return {
      ...details,
      ...this.bracketViewBuilder.build(details),
    };
  }
}
