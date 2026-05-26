import { Inject, Injectable } from '@nestjs/common';
import { IAthleteRepository } from '@/domain/athlete/repository/IAthleteRepository.repository';
import { ICategoryRepository } from '@/domain/category/repository/ICategoryRepository.repository';
import { CompetitionMode } from '@/domain/competition/domain/value-objects/competition-mode.enum';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { FightEntity } from '../../domain/entities/fight.entity';
import { IFightRepository } from '../../repository/IFightRepository.repository';
import {
  AbsoluteGpFightGenerationInput,
} from '../strategies/absolute-gp-fight-generation.strategy';
import { FightGenerationMetadata } from '../strategies/fight-generation.strategy';
import { FightGenerationStrategyResolverService } from '../services/fight-generation-strategy-resolver.service';

@Injectable()
export class GenerateFightsUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(ICategoryRepository)
    private readonly categoryRepository: ICategoryRepository,
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
    @Inject(IFightRepository)
    private readonly fightRepository: IFightRepository,
    private readonly strategyResolver: FightGenerationStrategyResolverService,
  ) {}

  async execute(competitionId: number) {
    const competition = await this.competitionRepository.findById(competitionId);

    if (!competition) {
      throw new NotFoundError(`Competition with id ${competitionId} not found`);
    }

    const existingFightsCount = await this.fightRepository.countByCompetitionId(
      competitionId,
    );

    if (existingFightsCount > 0) {
      throw new ValidationError('Fights have already been generated for this competition');
    }

    let fightsToCreate: FightEntity[] = [];
    let metadata: FightGenerationMetadata[] = [];

    if (competition.mode === CompetitionMode.KEYS) {
      throw new ValidationError(
        'Competitions in KEYS mode must generate fights per key group',
      );
    }

    const strategy = this.strategyResolver.resolve(
      competition.mode,
    ) as import('../strategies/fight-generation.strategy').FightGenerationStrategy<AbsoluteGpFightGenerationInput>;

    const categories = await this.categoryRepository.listByCompetitionId(
      competitionId,
    );

    for (const category of categories) {
      const athleteIds = await this.categoryRepository.listAthleteIdsByCategoryId(
        category.id as number,
      );
      const athletes = await this.athleteRepository.findByIds(athleteIds);
      const generated = strategy.generate({
        competitionId,
        categoryId: category.id as number,
        athletes,
      });

      fightsToCreate.push(...generated.fights);
      metadata.push(...generated.metadata);
    }

    const createdFights = await this.fightRepository.createMany(fightsToCreate);
    const linkedFights = await this.fightRepository.updateMany(
      this.linkBracketFights(createdFights),
    );
    const walkoverResolved = await this.fightRepository.updateMany(
      this.resolveInitialWalkovers(linkedFights),
    );

    return {
      fights: walkoverResolved.map((fight) => fight.toJSON()),
      metadata,
    };
  }

  private linkBracketFights(fights: FightEntity[]): FightEntity[] {
    const byGroup = new Map<string, FightEntity[]>();

    for (const fight of fights) {
      const key = `${fight.categoryId ?? 'null'}:${fight.keyGroupId ?? 'null'}`;
      byGroup.set(key, [...(byGroup.get(key) ?? []), fight]);
    }

    return Array.from(byGroup.values()).flatMap((groupFights) => {
      const byRound = new Map<number, FightEntity[]>();

      for (const fight of groupFights) {
        byRound.set(fight.round, [...(byRound.get(fight.round) ?? []), fight]);
      }

      const rounds = Array.from(byRound.keys()).sort((a, b) => a - b);
      const updated = new Map<number, FightEntity>();

      for (let index = 0; index < rounds.length - 1; index += 1) {
        const currentRound = (byRound.get(rounds[index]) ?? []).sort(
          (left, right) => left.order - right.order,
        );
        const nextRound = (byRound.get(rounds[index + 1]) ?? []).sort(
          (left, right) => left.order - right.order,
        );

        currentRound.forEach((fight, currentIndex) => {
          const targetFight = nextRound[Math.floor(currentIndex / 2)];
          if (!targetFight) {
            return;
          }

          updated.set(
            fight.id as number,
            fight.updateDetails({
              nextFightId: targetFight.id as number,
              nextFightSlot: currentIndex % 2 === 0 ? 'A' : 'B',
            }),
          );
        });
      }

      return groupFights.map((fight) => updated.get(fight.id as number) ?? fight);
    });
  }

  private resolveInitialWalkovers(fights: FightEntity[]): FightEntity[] {
    const byId = new Map(fights.map((fight) => [fight.id as number, fight]));

    const firstRoundFights = fights
      .filter((fight) => fight.round === 1)
      .sort((left, right) => left.order - right.order);

    for (const fight of firstRoundFights) {
      const athleteIds = [fight.athleteAId, fight.athleteBId].filter(
        (athleteId): athleteId is number => athleteId !== null,
      );

      if (athleteIds.length !== 1) {
        continue;
      }

      const winnerId = athleteIds[0];
      const finishedFight = fight.finish({
        winnerId,
        loserId: null,
        winType: 'WO',
        finishedAt: new Date(),
        isWo: true,
      });
      byId.set(fight.id as number, finishedFight);

      if (!fight.nextFightId || !fight.nextFightSlot) {
        continue;
      }

      const nextFight = byId.get(fight.nextFightId);
      if (!nextFight) {
        continue;
      }

      byId.set(
        fight.nextFightId,
        nextFight.updateDetails({
          athleteAId:
            fight.nextFightSlot === 'A' ? winnerId : nextFight.athleteAId,
          athleteBId:
            fight.nextFightSlot === 'B' ? winnerId : nextFight.athleteBId,
        }),
      );
    }

    return fights.map((fight) => byId.get(fight.id as number) ?? fight);
  }
}
