import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { IAthleteRepository } from '@/domain/athlete/repository/IAthleteRepository.repository';
import { IUserCompetitionRepository } from '@/domain/auth/repository/IUserCompetitionRepository.repository';
import { ICategoryRepository } from '@/domain/category/repository/ICategoryRepository.repository';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { FightEntity } from '../../domain/entities/fight.entity';
import { IFightRepository } from '../../repository/IFightRepository.repository';

type Input = {
  currentUserId: number;
  competitionId: number;
  categoryId: number;
  athleteAId: number;
  athleteBId: number;
  round: number;
  order: number;
  areaId?: number | null;
};

@Injectable()
export class CreateManualFightUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(IUserCompetitionRepository)
    private readonly userCompetitionRepository: IUserCompetitionRepository,
    @Inject(ICategoryRepository)
    private readonly categoryRepository: ICategoryRepository,
    @Inject(IAthleteRepository)
    private readonly athleteRepository: IAthleteRepository,
    @Inject(IFightRepository)
    private readonly fightRepository: IFightRepository,
  ) {}

  async execute(input: Input) {
    await this.assertAccess(input.currentUserId, input.competitionId);

    if (input.athleteAId === input.athleteBId) {
      throw new ValidationError('A luta manual exige dois atletas distintos');
    }

    const category = await this.categoryRepository.findById(input.categoryId);
    if (!category || category.competitionId !== input.competitionId) {
      throw new NotFoundError(`Category with id ${input.categoryId} not found`);
    }

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

    const categoryAthleteIds = new Set(
      await this.categoryRepository.listAthleteIdsByCategoryId(input.categoryId),
    );
    if (
      !categoryAthleteIds.has(input.athleteAId) ||
      !categoryAthleteIds.has(input.athleteBId)
    ) {
      throw new ValidationError('Os atletas nao pertencem a categoria informada');
    }

    const existingFights = await this.fightRepository.listByCompetitionId({
      competitionId: input.competitionId,
      categoryId: input.categoryId,
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
        categoryId: input.categoryId,
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

  private async assertAccess(userId: number, competitionId: number) {
    const competition = await this.competitionRepository.findById(competitionId);
    if (!competition) {
      throw new NotFoundError(`Competition with id ${competitionId} not found`);
    }

    const access =
      await this.userCompetitionRepository.findByUserIdAndCompetitionId({
        userId,
        competitionId,
      });

    if (!access) {
      throw new ForbiddenException(
        'Usuario autenticado nao possui acesso a esta competicao',
      );
    }
  }
}
