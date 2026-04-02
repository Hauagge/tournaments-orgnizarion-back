import { Inject, Injectable } from '@nestjs/common';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { IFightRepository } from '@/domain/fight/repository/IFightRepository.repository';
import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';
import { FightGenerationStrategyResolverService } from '@/domain/fight/application/services/fight-generation-strategy-resolver.service';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { KeyGroupStatus } from '../../domain/value-objects/key-group-status.enum';
import { IKeyGroupRepository } from '../../repository/IKeyGroupRepository.repository';
import { KeysFightGenerationInput } from '../strategies/keys-fight-generation.strategy';

@Injectable()
export class GenerateFightsForKeyGroupUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(IKeyGroupRepository)
    private readonly keyGroupRepository: IKeyGroupRepository,
    @Inject(IFightRepository)
    private readonly fightRepository: IFightRepository,
    private readonly strategyResolver: FightGenerationStrategyResolverService,
  ) {}

  async execute(keyGroupId: number) {
    const group = await this.keyGroupRepository.findById(keyGroupId);

    if (!group) {
      throw new NotFoundError(`Key group with id ${keyGroupId} not found`);
    }

    if (group.status === KeyGroupStatus.DRAFT) {
      throw new ValidationError('At least 2 athletes are required before generating fights');
    }

    const competition = await this.competitionRepository.findById(
      group.competitionId,
    );

    if (!competition) {
      throw new NotFoundError(`Competition with id ${group.competitionId} not found`);
    }

    if (competition.mode !== CompetitionMode.KEYS) {
      throw new ValidationError('This endpoint is only available for competitions in KEYS mode');
    }

    const members = await this.keyGroupRepository.listMembersByKeyGroupId(keyGroupId);
    if (members.length < 2 || members.length > 4) {
      throw new ValidationError('Key groups must contain between 2 and 4 athletes');
    }

    const existingFights = await this.fightRepository.listByKeyGroupId(keyGroupId);
    const hasNonCanceledFight = existingFights.some(
      (fight) => fight.status !== FightStatus.CANCELED,
    );
    if (hasNonCanceledFight) {
      throw new ValidationError('Fights have already been generated for this key group');
    }

    const strategy = this.strategyResolver.resolve(
      competition.mode,
    ) as import('@/domain/fight/application/strategies/fight-generation.strategy').FightGenerationStrategy<KeysFightGenerationInput>;

    const generated = strategy.generate({
      competitionId: group.competitionId,
      keyGroupId,
      categoryId: group.categoryId,
      athleteIds: members.map((member) => member.athleteId),
    });

    const fights = await this.fightRepository.createMany(generated.fights);

    return {
      fights: fights.map((fight) => fight.toJSON()),
      metadata: generated.metadata,
    };
  }
}
