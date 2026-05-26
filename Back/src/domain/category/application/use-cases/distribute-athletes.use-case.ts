import { Inject, Injectable } from '@nestjs/common';
import { IAthleteRepository } from '@/domain/athlete/repository/IAthleteRepository.repository';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { IWeighInRepository } from '@/domain/weighin/repository/IWeighInRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import {
  CategoryAthleteAddition,
  ICategoryRepository,
} from '../../repository/ICategoryRepository.repository';
import {
  CategoryDistributionService,
  DistributionRejectionReason,
} from '../services/category-distribution.service';
import { DistributeAthletesView } from './distribute-athletes.view';

export type DistributeAthletesInput = {
  competitionId: number;
};

@Injectable()
export class DistributeAthletesUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(ICategoryRepository)
    private readonly categoryRepository: ICategoryRepository,
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
    @Inject(IWeighInRepository)
    private readonly weighInRepository: IWeighInRepository,
    private readonly categoryDistributionService: CategoryDistributionService,
  ) {}

  async execute(
    input: DistributeAthletesInput,
  ): Promise<DistributeAthletesView> {
    const competition = await this.competitionRepository.findById(
      input.competitionId,
    );

    if (!competition) {
      throw new NotFoundError(
        `Competition with id ${input.competitionId} not found`,
      );
    }

    const [athletes, categories, assignedAthleteIds] = await Promise.all([
      this.athleteRepository.search({ competitionId: input.competitionId }),
      this.categoryRepository.listByCompetitionId(input.competitionId),
      this.categoryRepository.listAthleteIdsByCompetitionId(
        input.competitionId,
      ),
    ]);

    if (categories.length === 0) {
      throw new ValidationError(
        'Nenhuma categoria cadastrada para este campeonato',
      );
    }

    const eligibleAthleteIds = athletes
      .map((athlete) => athlete.id)
      .filter((id): id is number => id !== undefined);

    const weighIns = eligibleAthleteIds.length
      ? await this.weighInRepository.findByCompetitionIdAndAthleteIds(
          input.competitionId,
          eligibleAthleteIds,
        )
      : [];

    const weighInsByAthleteId = new Map(
      weighIns.map((weighIn) => [weighIn.athleteId, weighIn]),
    );

    const result = this.categoryDistributionService.distribute({
      athletes,
      categories,
      weighInsByAthleteId,
      alreadyAssignedAthleteIds: new Set(assignedAthleteIds),
    });

    if (result.allocated.length > 0) {
      const additionsMap = new Map<number, number[]>();
      for (const allocation of result.allocated) {
        const list = additionsMap.get(allocation.categoryId) ?? [];
        list.push(allocation.athleteId);
        additionsMap.set(allocation.categoryId, list);
      }

      const additions: CategoryAthleteAddition[] = Array.from(
        additionsMap.entries(),
      ).map(([categoryId, athleteIds]) => ({ categoryId, athleteIds }));

      await this.categoryRepository.addAthletesToCategories(additions);
    }

    const athletesById = new Map(
      athletes.map((athlete) => [athlete.id as number, athlete]),
    );
    const categoriesById = new Map(
      categories.map((category) => [category.id as number, category]),
    );

    const allocationGroups = new Map<
      number,
      { category: ReturnType<typeof categoriesById.get>; athleteIds: number[] }
    >();
    for (const allocation of result.allocated) {
      const group = allocationGroups.get(allocation.categoryId) ?? {
        category: categoriesById.get(allocation.categoryId),
        athleteIds: [],
      };
      group.athleteIds.push(allocation.athleteId);
      allocationGroups.set(allocation.categoryId, group);
    }

    const allocations = Array.from(allocationGroups.values())
      .filter((group) => group.category !== undefined)
      .map((group) => ({
        categoryId: group.category!.id as number,
        categoryName: group.category!.name,
        belt: group.category!.belt,
        athletes: group.athleteIds
          .map((athleteId) => athletesById.get(athleteId))
          .filter((athlete): athlete is NonNullable<typeof athlete> =>
            Boolean(athlete),
          )
          .map((athlete) => ({
            id: athlete.id as number,
            fullName: athlete.fullName,
          }))
          .sort((left, right) => left.fullName.localeCompare(right.fullName)),
      }))
      .sort((left, right) =>
        left.categoryName.localeCompare(right.categoryName),
      );

    const rejected = result.rejected
      .map((item) => {
        const athlete = athletesById.get(item.athleteId);
        return athlete
          ? {
              athleteId: item.athleteId,
              fullName: athlete.fullName,
              belt: athlete.belt,
              reason: item.reason,
              detail: item.detail,
            }
          : null;
      })
      .filter(
        (
          item,
        ): item is {
          athleteId: number;
          fullName: string;
          belt: string;
          reason: DistributionRejectionReason;
          detail: string;
        } => item !== null,
      )
      .sort((left, right) => left.fullName.localeCompare(right.fullName));

    return {
      competitionId: input.competitionId,
      summary: {
        totalEligible: athletes.length,
        totalAllocated: result.allocated.length,
        totalRejected: result.rejected.length,
      },
      allocations,
      rejected,
    };
  }
}
