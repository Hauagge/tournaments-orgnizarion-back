import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { IAthleteRepository } from '@/domain/athlete/repository/IAthleteRepository.repository';
import { IUserCompetitionRepository } from '@/domain/auth/repository/IUserCompetitionRepository.repository';
import { ICategoryRepository } from '@/domain/category/repository/ICategoryRepository.repository';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { FightStatus } from '../../domain/value-objects/fight-status.enum';
import { IFightRepository } from '../../repository/IFightRepository.repository';

type Input = {
  currentUserId: number;
  competitionId: number;
  fightId: number;
  athleteAId?: number | null;
  athleteBId?: number | null;
  round?: number;
  order?: number;
  areaId?: number | null;
  status?: FightStatus;
};

@Injectable()
export class UpdateFightUseCase {
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

    const fight = await this.fightRepository.findById(input.fightId);
    if (!fight || fight.competitionId !== input.competitionId) {
      throw new NotFoundError(`Fight with id ${input.fightId} not found`);
    }

    const athleteIds = [input.athleteAId, input.athleteBId].filter(
      (athleteId): athleteId is number => athleteId !== undefined && athleteId !== null,
    );
    if (athleteIds.length > 0) {
      const athletes = await this.athleteRepository.findByIds(athleteIds);
      if (athletes.length !== athleteIds.length) {
        throw new ValidationError('Atleta inexistente para esta competicao');
      }
      if (athletes.some((athlete) => athlete.competitionId !== input.competitionId)) {
        throw new ValidationError('Os atletas precisam pertencer a competicao');
      }
      if (fight.categoryId !== null) {
        const categoryAthleteIds = new Set(
          await this.categoryRepository.listAthleteIdsByCategoryId(fight.categoryId),
        );
        if (
          athleteIds.some((athleteId) => !categoryAthleteIds.has(athleteId))
        ) {
          throw new ValidationError('Os atletas nao pertencem a categoria da luta');
        }
      }
    }

    const nextAthleteAId = input.athleteAId !== undefined ? input.athleteAId : fight.athleteAId;
    const nextAthleteBId = input.athleteBId !== undefined ? input.athleteBId : fight.athleteBId;
    if (
      nextAthleteAId !== null &&
      nextAthleteBId !== null &&
      nextAthleteAId === nextAthleteBId
    ) {
      throw new ValidationError('A luta exige dois atletas distintos');
    }

    return this.fightRepository.update(
      fight.updateDetails({
        athleteAId: input.athleteAId,
        athleteBId: input.athleteBId,
        round: input.round,
        order: input.order,
        areaId: input.areaId,
        status: input.status,
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
