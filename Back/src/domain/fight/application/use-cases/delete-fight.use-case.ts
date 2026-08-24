import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { IFightRepository } from '../../repository/IFightRepository.repository';

@Injectable()
export class DeleteFightUseCase {
  constructor(
    @Inject(IFightRepository)
    private readonly fightRepository: IFightRepository,
  ) {}

  async execute(input: {
    currentUserId: number;
    competitionId: number;
    fightId: number;
  }) {
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
}
