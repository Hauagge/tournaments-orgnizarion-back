import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { Competition } from '../../domain/entities/competition.entity';
import { ICompetitionRepository } from '../../repository/ICompetitionRepository.repository';

@Injectable()
export class GetCompetitionUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
  ) {}

  async execute(id: number): Promise<Competition> {
    const competition = await this.competitionRepository.findById(id);

    if (!competition) {
      throw new NotFoundError(`Competition with id ${id} not found`);
    }

    return competition;
  }
}
