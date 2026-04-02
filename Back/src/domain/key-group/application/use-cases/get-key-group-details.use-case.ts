import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { IKeyGroupRepository, KeyGroupDetailsView } from '../../repository/IKeyGroupRepository.repository';

@Injectable()
export class GetKeyGroupDetailsUseCase {
  constructor(
    @Inject(IKeyGroupRepository)
    private readonly keyGroupRepository: IKeyGroupRepository,
  ) {}

  async execute(id: number): Promise<KeyGroupDetailsView> {
    const details = await this.keyGroupRepository.getDetails(id);

    if (!details) {
      throw new NotFoundError(`Key group with id ${id} not found`);
    }

    return details;
  }
}
