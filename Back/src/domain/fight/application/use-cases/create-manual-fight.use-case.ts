import { Inject, Injectable } from '@nestjs/common';
import { IAthleteRepository } from '@/domain/athlete/repository/IAthleteRepository.repository';
import { ICategoryRepository } from '@/domain/category/repository/ICategoryRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { FightEntity } from '../../domain/entities/fight.entity';
import { IFightRepository } from '../../repository/IFightRepository.repository';

type Input = {
  currentUserId: number;
  competitionId: number;
  athleteAId: number;
  athleteBId: number;
  round: number;
  order: number;
  categoryId?: number;
  areaId?: number | null;
};

@Injectable()
export class CreateManualFightUseCase {
  constructor(
    @Inject(ICategoryRepository)
    private readonly categoryRepository: ICategoryRepository,
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
    @Inject(IFightRepository)
    private readonly fightRepository: IFightRepository,
  ) {}

  async execute(input: Input) {
    if (input.athleteAId === input.athleteBId) {
      throw new ValidationError('A luta manual exige dois atletas distintos');
    }

    const category = await this.resolveCategory(input);

    const athletes = await this.athleteRepository.findByIds([
      input.athleteAId,
      input.athleteBId,
    ]);
    if (athletes.length !== 2) {
      throw new ValidationError('Atleta inexistente para esta competicao');
    }

    const invalidAthlete = athletes.find(
      (athlete) => athlete.competitionId !== input.competitionId,
    );
    if (invalidAthlete) {
      throw new ValidationError('Os atletas precisam pertencer a competicao');
    }

    if (category) {
      const categoryAthleteIds = new Set(
        await this.categoryRepository.listAthleteIdsByCategoryId(
          category.id as number,
        ),
      );
      if (
        !categoryAthleteIds.has(input.athleteAId) ||
        !categoryAthleteIds.has(input.athleteBId)
      ) {
        throw new ValidationError(
          'Os atletas nao pertencem a categoria informada',
        );
      }
    }

    const existingFights = await this.fightRepository.listByCompetitionId({
      competitionId: input.competitionId,
      categoryId: category?.id as number | undefined,
    });
    const duplicated = existingFights.some((fight) => {
      if (fight.status === 'CANCELED') {
        return false;
      }

      return (
        (fight.athleteAId === input.athleteAId &&
          fight.athleteBId === input.athleteBId) ||
        (fight.athleteAId === input.athleteBId &&
          fight.athleteBId === input.athleteAId)
      );
    });

    if (duplicated) {
      throw new ValidationError('Ja existe luta ativa para estes atletas');
    }

    return this.fightRepository.create(
      FightEntity.create({
        competitionId: input.competitionId,
        categoryId: category?.id ?? null,
        keyGroupId: null,
        round: input.round,
        order: input.order,
        areaId: input.areaId ?? null,
        areaName: null,
        athleteAId: input.athleteAId,
        athleteBId: input.athleteBId,
      }).updateDetails({
        createdManually: true,
      }),
    );
  }

  private async resolveCategory(input: Input) {
    if (input.categoryId === undefined) {
      return null;
    }

    const category = await this.categoryRepository.findById(input.categoryId);
    if (!category || category.competitionId !== input.competitionId) {
      throw new NotFoundError(`Category with id ${input.categoryId} not found`);
    }

    return category;
  }
}
