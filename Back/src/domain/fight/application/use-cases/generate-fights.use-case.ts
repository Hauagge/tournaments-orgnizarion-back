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

    return {
      fights: createdFights.map((fight) => fight.toJSON()),
      metadata,
    };
  }
}
