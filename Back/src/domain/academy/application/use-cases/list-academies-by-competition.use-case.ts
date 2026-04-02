import { Inject, Injectable } from '@nestjs/common';
import { ICompetitionRepository } from '@/domain/competition/repository/ICompetitionRepository.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { Academy } from '../../domain/entities/academy.entity';
import { IAcademyRepository } from '../../repository/IAcademyRepository.repository';

export type ListAcademiesByCompetitionInput = {
  competitionId: number;
};

@Injectable()
export class ListAcademiesByCompetitionUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
    @Inject(IAcademyRepository)
    private readonly academyRepository: IAcademyRepository,
  ) {}

  async execute(input: ListAcademiesByCompetitionInput): Promise<Academy[]> {
    const competition = await this.competitionRepository.findById(
      input.competitionId,
    );

    if (!competition) {
      throw new NotFoundError(
        `Competition with id ${input.competitionId} not found`,
      );
    }

    return this.academyRepository.listByCompetitionId(input.competitionId);
  }
}
