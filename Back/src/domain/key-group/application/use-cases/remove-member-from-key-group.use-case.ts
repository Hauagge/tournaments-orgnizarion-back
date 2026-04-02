import { Inject, Injectable } from '@nestjs/common';
import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';
import { IFightRepository } from '@/domain/fight/repository/IFightRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { KeyGroupStatus } from '../../domain/value-objects/key-group-status.enum';
import { IKeyGroupRepository } from '../../repository/IKeyGroupRepository.repository';

export type RemoveMemberFromKeyGroupInput = {
  keyGroupId: number;
  athleteId: number;
};

@Injectable()
export class RemoveMemberFromKeyGroupUseCase {
  constructor(
    @Inject(IKeyGroupRepository)
    private readonly keyGroupRepository: IKeyGroupRepository,
    @Inject(IFightRepository)
    private readonly fightRepository: IFightRepository,
  ) {}

  async execute(input: RemoveMemberFromKeyGroupInput): Promise<void> {
    const group = await this.keyGroupRepository.findById(input.keyGroupId);

    if (!group) {
      throw new NotFoundError(`Key group with id ${input.keyGroupId} not found`);
    }

    if (group.status === KeyGroupStatus.LOCKED) {
      throw new ValidationError('Locked key groups cannot be changed');
    }

    const fights = await this.fightRepository.listByKeyGroupId(group.id as number);
    const hasActiveFights = fights.some((fight) => fight.status !== FightStatus.CANCELED);

    if (hasActiveFights) {
      throw new ValidationError('Cannot remove members after fights have already been generated');
    }

    await this.keyGroupRepository.removeMember(input.keyGroupId, input.athleteId);

    const remainingMembers = await this.keyGroupRepository.listMembersByKeyGroupId(
      input.keyGroupId,
    );
    await this.keyGroupRepository.update(
      remainingMembers.length >= 2
        ? group.markReady()
        : group.markDraft(),
    );
  }
}
