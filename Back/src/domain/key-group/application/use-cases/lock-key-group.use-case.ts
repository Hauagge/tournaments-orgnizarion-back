import { Inject, Injectable } from '@nestjs/common';
import { IFightRepository } from '@/domain/fight/repository/IFightRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { KeyGroupStatus } from '../../domain/value-objects/key-group-status.enum';
import { IKeyGroupRepository } from '../../repository/IKeyGroupRepository.repository';

@Injectable()
export class LockKeyGroupUseCase {
  constructor(
    @Inject(IKeyGroupRepository)
    private readonly keyGroupRepository: IKeyGroupRepository,
    @Inject(IFightRepository)
    private readonly fightRepository: IFightRepository,
  ) {}

  async execute(id: number) {
    const group = await this.keyGroupRepository.findById(id);

    if (!group) {
      throw new NotFoundError(`Key group with id ${id} not found`);
    }

    const members = await this.keyGroupRepository.listMembersByKeyGroupId(id);
    if (members.length < 2 || members.length > 4) {
      throw new ValidationError('Only key groups with 2 to 4 athletes can be locked');
    }

    const fights = await this.fightRepository.listByKeyGroupId(id);
    if (fights.length === 0) {
      throw new ValidationError('Generate fights before locking the key group');
    }

    if (group.status === KeyGroupStatus.LOCKED) {
      return group;
    }

    return this.keyGroupRepository.update(group.lock());
  }
}
