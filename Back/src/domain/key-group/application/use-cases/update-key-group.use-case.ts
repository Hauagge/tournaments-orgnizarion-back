import { Inject, Injectable } from '@nestjs/common';
import { IAthleteRepository } from '@/domain/athlete/repository/IAthleteRepository.repository';
import { ICategoryRepository } from '@/domain/category/repository/ICategoryRepository.repository';
import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';
import { IFightRepository } from '@/domain/fight/repository/IFightRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { KeyGroup } from '../../domain/entities/key-group.entity';
import { KeyGroupStatus } from '../../domain/value-objects/key-group-status.enum';
import { IKeyGroupRepository } from '../../repository/IKeyGroupRepository.repository';

export type UpdateKeyGroupInput = {
  id: number;
  name?: string | null;
  categoryId?: number | null;
  athleteIds?: number[];
};

@Injectable()
export class UpdateKeyGroupUseCase {
  constructor(
    @Inject(IKeyGroupRepository)
    private readonly keyGroupRepository: IKeyGroupRepository,
    @Inject(ICategoryRepository)
    private readonly categoryRepository: ICategoryRepository,
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
    @Inject(IFightRepository)
    private readonly fightRepository: IFightRepository,
  ) {}

  async execute(input: UpdateKeyGroupInput): Promise<KeyGroup> {
    const group = await this.keyGroupRepository.findById(input.id);

    if (!group) {
      throw new NotFoundError(`Key group with id ${input.id} not found`);
    }

    if (group.status === KeyGroupStatus.LOCKED) {
      throw new ValidationError('Locked key groups cannot be changed');
    }

    const fights = await this.fightRepository.listByKeyGroupId(group.id as number);
    const hasGeneratedFights = fights.some(
      (fight) => fight.status !== FightStatus.CANCELED,
    );

    if (input.categoryId !== undefined) {
      if (hasGeneratedFights && input.categoryId !== group.categoryId) {
        throw new ValidationError(
          'Cannot change the category after fights have already been generated',
        );
      }

      if (input.categoryId !== null) {
        const category = await this.categoryRepository.findById(input.categoryId);

        if (!category || category.competitionId !== group.competitionId) {
          throw new ValidationError('Category does not belong to the selected competition');
        }
      }
    }

    if (input.athleteIds !== undefined) {
      if (hasGeneratedFights) {
        throw new ValidationError(
          'Cannot change athletes after fights have already been generated',
        );
      }

      await this.replaceMembers(group, input.athleteIds);
    }

    const nextMembers = await this.keyGroupRepository.listMembersByKeyGroupId(
      group.id as number,
    );
    const nextStatus =
      nextMembers.length >= 2 ? KeyGroupStatus.READY : KeyGroupStatus.DRAFT;

    const updatedGroup = group.update({
      name: input.name,
      categoryId: input.categoryId,
      status: nextStatus,
    });

    return this.keyGroupRepository.update(updatedGroup);
  }

  private async replaceMembers(group: KeyGroup, athleteIds: number[]): Promise<void> {
    const uniqueAthleteIds = [...new Set(athleteIds)];

    if (uniqueAthleteIds.length !== athleteIds.length) {
      throw new ValidationError('Athlete list contains duplicated ids');
    }

    if (uniqueAthleteIds.length > 4) {
      throw new ValidationError('A key group can have at most 4 athletes');
    }

    const athletes = await this.athleteRepository.findByIds(uniqueAthleteIds);

    if (athletes.length !== uniqueAthleteIds.length) {
      throw new ValidationError('One or more athletes were not found');
    }

    for (const athlete of athletes) {
      if (athlete.competitionId !== group.competitionId) {
        throw new ValidationError('All athletes must belong to the same competition');
      }

      const existingGroup = await this.keyGroupRepository.findByCompetitionIdAndAthleteId(
        group.competitionId,
        athlete.id as number,
      );

      if (existingGroup && existingGroup.id !== group.id) {
        throw new ValidationError(
          `Athlete ${athlete.id as number} is already assigned to another key group in this competition`,
        );
      }
    }

    const currentMembers = await this.keyGroupRepository.listMembersByKeyGroupId(
      group.id as number,
    );
    const currentAthleteIds = new Set(currentMembers.map((member) => member.athleteId));
    const nextAthleteIds = new Set(uniqueAthleteIds);

    for (const member of currentMembers) {
      if (!nextAthleteIds.has(member.athleteId)) {
        await this.keyGroupRepository.removeMember(group.id as number, member.athleteId);
      }
    }

    for (const athleteId of uniqueAthleteIds) {
      if (!currentAthleteIds.has(athleteId)) {
        await this.keyGroupRepository.addMember(group.id as number, athleteId);
      }
    }
  }
}
