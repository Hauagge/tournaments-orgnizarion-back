import { Inject, Injectable } from '@nestjs/common';
import { IAcademyRepository } from '@/domain/academy/repository/IAcademyRepository.repository';
import { IAthleteRepository } from '@/domain/athlete/repository/IAthleteRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { WeighInStatus } from '@/domain/weighin/domain/value-objects/weigh-in-status.enum';
import { IWeighInRepository } from '@/domain/weighin/repository/IWeighInRepository.repository';
import { ICategoryRepository } from '../../repository/ICategoryRepository.repository';
import { CategoryDetailView } from './category-detail.view';

@Injectable()
export class GetCategoryUseCase {
  constructor(
    @Inject(ICategoryRepository)
    private readonly categoryRepository: ICategoryRepository,
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
    @Inject(IAcademyRepository)
    private readonly academyRepository: IAcademyRepository,
    @Inject(IWeighInRepository)
    private readonly weighInRepository: IWeighInRepository,
  ) {}

  async execute(id: number): Promise<CategoryDetailView> {
    const category = await this.categoryRepository.findById(id);

    if (!category) {
      throw new NotFoundError(`Category with id ${id} not found`);
    }

    const athleteIds = await this.categoryRepository.listAthleteIdsByCategoryId(id);
    const [athletes, academies, weighIns] = await Promise.all([
      this.athleteRepository.findByIds(athleteIds),
      this.academyRepository.listByCompetitionId(category.competitionId),
      athleteIds.length
        ? this.weighInRepository.findByCompetitionIdAndAthleteIds(
            category.competitionId,
            athleteIds,
          )
        : Promise.resolve([]),
    ]);

    const academyNamesById = new Map(
      academies.map((academy) => [academy.id as number, academy.name]),
    );
    const weighInStatusByAthleteId = new Map(
      weighIns.map((weighIn) => [weighIn.athleteId, weighIn.status]),
    );

    return {
      id: category.id as number,
      competitionId: category.competitionId,
      name: category.name,
      belt: category.belt,
      ageMin: category.ageMin,
      ageMax: category.ageMax,
      weightMinGrams: category.weightMinGrams,
      weightMaxGrams: category.weightMaxGrams,
      totalAthletes: category.totalAthletes,
      athletes: athletes
        .map((athlete) => ({
          id: athlete.id as number,
          fullName: athlete.fullName,
          belt: athlete.belt,
          academyName:
            athlete.academyId !== null
              ? academyNamesById.get(athlete.academyId) ?? null
              : null,
          weighInStatus:
            weighInStatusByAthleteId.get(athlete.id as number) ??
            WeighInStatus.PENDING,
        }))
        .sort((left, right) => left.fullName.localeCompare(right.fullName)),
    };
  }
}
