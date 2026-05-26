import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { IUserCompetitionRepository } from '@/domain/auth/repository/IUserCompetitionRepository.repository';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { IFightRepository } from '../../repository/IFightRepository.repository';

@Injectable()
export class DeleteFightUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(IUserCompetitionRepository)
    private readonly userCompetitionRepository: IUserCompetitionRepository,
    @Inject(IFightRepository)
    private readonly fightRepository: IFightRepository,
  ) {}

  async execute(input: {
    currentUserId: number;
    competitionId: number;
    fightId: number;
  }) {
    await this.assertAccess(input.currentUserId, input.competitionId);

    const fight = await this.fightRepository.findById(input.fightId);
    if (!fight || fight.competitionId !== input.competitionId) {
      throw new NotFoundError(`Fight with id ${input.fightId} not found`);
    }

    if (!fight.createdManually) {
      throw new ValidationError('Somente lutas manuais podem ser removidas por este endpoint');
    }

    if (fight.winnerId !== null || fight.nextFightId !== null) {
      throw new ValidationError('A luta manual nao pode ser removida apos gerar avancos');
    }

    await this.fightRepository.delete(input.fightId);

    return {
      deleted: true,
      fightId: input.fightId,
    };
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
