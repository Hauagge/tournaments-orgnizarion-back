import { Inject, Injectable } from '@nestjs/common';
import { DistributeAreaFightsUseCase } from '@/domain/area/application/use-cases/distribute-area-fights.use-case';
import { DistributionMode } from '@/domain/area/application/value-objects/distribution-mode.enum';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { FightEntity } from '@/domain/fight/domain/entities/fight.entity';
import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';
import { IFightRepository } from '@/domain/fight/repository/IFightRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { KeyGroupStatus } from '../../domain/value-objects/key-group-status.enum';
import { IKeyGroupRepository } from '../../repository/IKeyGroupRepository.repository';

export type CreateFightForKeyGroupInput = {
  keyGroupId: number;
  athleteAId: number;
  athleteBId: number;
  orderIndex?: number;
};

@Injectable()
export class CreateFightForKeyGroupUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(IKeyGroupRepository)
    private readonly keyGroupRepository: IKeyGroupRepository,
    @Inject(IFightRepository)
    private readonly fightRepository: IFightRepository,
    private readonly distributeAreaFightsUseCase: DistributeAreaFightsUseCase,
  ) {}

  async execute(input: CreateFightForKeyGroupInput): Promise<FightEntity> {
    if (input.athleteAId === input.athleteBId) {
      throw new ValidationError('A fight requires two different athletes');
    }

    const group = await this.keyGroupRepository.findById(input.keyGroupId);

    if (!group) {
      throw new NotFoundError(`Key group with id ${input.keyGroupId} not found`);
    }

    if (group.status === KeyGroupStatus.DRAFT) {
      throw new ValidationError(
        'At least 2 athletes are required before creating fights',
      );
    }

    const competition = await this.competitionRepository.findById(
      group.competitionId,
    );

    if (!competition) {
      throw new NotFoundError(`Competition with id ${group.competitionId} not found`);
    }

    if (competition.mode !== CompetitionMode.KEYS) {
      throw new ValidationError(
        'This endpoint is only available for competitions in KEYS mode',
      );
    }

    const members = await this.keyGroupRepository.listMembersByKeyGroupId(
      input.keyGroupId,
    );
    const memberIds = new Set(members.map((member) => member.athleteId));

    if (!memberIds.has(input.athleteAId) || !memberIds.has(input.athleteBId)) {
      throw new ValidationError('Both athletes must belong to the key group');
    }

    const existingFights = await this.fightRepository.listByKeyGroupId(
      input.keyGroupId,
    );
    const hasDuplicatedFight = existingFights.some((fight) => {
      if (fight.status === FightStatus.CANCELED) {
        return false;
      }

      return (
        (fight.athleteAId === input.athleteAId &&
          fight.athleteBId === input.athleteBId) ||
        (fight.athleteAId === input.athleteBId &&
          fight.athleteBId === input.athleteAId)
      );
    });

    if (hasDuplicatedFight) {
      throw new ValidationError(
        'A non-canceled fight already exists for these athletes in this key group',
      );
    }

    const nextOrderIndex =
      input.orderIndex ??
      existingFights.reduce(
        (highest, fight) => Math.max(highest, fight.orderIndex),
        0,
      ) + 1;
    const inferredAreaId =
      existingFights.find((fight) => fight.areaId !== null)?.areaId ?? null;

    const [fight] = await this.fightRepository.createMany([
      FightEntity.create({
        competitionId: group.competitionId,
        categoryId: group.categoryId,
        keyGroupId: input.keyGroupId,
        round: 1,
        order: nextOrderIndex,
        areaId: inferredAreaId,
        areaName: null,
        athleteAId: input.athleteAId,
        athleteBId: input.athleteBId,
      }),
    ]);

    if (inferredAreaId === null) {
      await this.distributeAreaFightsUseCase.execute({
        competitionId: group.competitionId,
        mode: DistributionMode.INCREMENTAL,
        restGapFights: 2,
        fightIds: [fight.id as number],
      });
    }

    return fight;
  }
}
