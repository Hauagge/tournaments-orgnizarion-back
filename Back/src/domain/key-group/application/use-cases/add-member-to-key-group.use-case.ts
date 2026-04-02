import { Inject, Injectable } from '@nestjs/common';
import { IAthleteRepository } from '@/domain/athlete/repository/IAthleteRepository.repository';
import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';
import { IFightRepository } from '@/domain/fight/repository/IFightRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { KeyGroupStatus } from '../../domain/value-objects/key-group-status.enum';
import { IKeyGroupRepository } from '../../repository/IKeyGroupRepository.repository';

export type AddMemberToKeyGroupInput = {
  keyGroupId: number;
  athleteId: number;
};

@Injectable()
export class AddMemberToKeyGroupUseCase {
  constructor(
    @Inject(IKeyGroupRepository)
    private readonly keyGroupRepository: IKeyGroupRepository,
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
    @Inject(IFightRepository)
    private readonly fightRepository: IFightRepository,
  ) {}

  async execute(input: AddMemberToKeyGroupInput) {
    const [group, athlete] = await Promise.all([
      this.keyGroupRepository.findById(input.keyGroupId),
      this.athleteRepository.findById(input.athleteId),
    ]);

    if (!group) {
      throw new NotFoundError(`Key group with id ${input.keyGroupId} not found`);
    }

    if (!athlete) {
      throw new NotFoundError(`Athlete with id ${input.athleteId} not found`);
    }

    if (group.status === KeyGroupStatus.LOCKED) {
      throw new ValidationError('Locked key groups cannot be changed');
    }

    if (athlete.competitionId !== group.competitionId) {
      throw new ValidationError('Athlete does not belong to the same competition');
    }

    const [currentMembers, existingGroup] = await Promise.all([
      this.keyGroupRepository.listMembersByKeyGroupId(group.id as number),
      this.keyGroupRepository.findByCompetitionIdAndAthleteId(
        group.competitionId,
        athlete.id as number,
      ),
    ]);

    if (currentMembers.some((member) => member.athleteId === athlete.id)) {
      throw new ValidationError('Athlete is already in this key group');
    }

    if (currentMembers.length >= 4) {
      throw new ValidationError('A key group can have at most 4 athletes');
    }

    if (existingGroup && existingGroup.id !== group.id) {
      throw new ValidationError('Athlete is already assigned to another key group in this competition');
    }

    const fights = await this.fightRepository.listByKeyGroupId(group.id as number);
    const hasActiveFights = fights.some((fight) => fight.status !== FightStatus.CANCELED);
    if (hasActiveFights) {
      throw new ValidationError('Cannot add members after fights have already been generated');
    }

    const member = await this.keyGroupRepository.addMember(
      group.id as number,
      athlete.id as number,
    );

    const nextStatus =
      currentMembers.length + 1 >= 2 ? group.markReady() : group.markDraft();
    if (nextStatus.status !== group.status) {
      await this.keyGroupRepository.update(nextStatus);
    }

    return member;
  }
}
