import { Inject, Injectable } from '@nestjs/common';
import { ICompetitionRepository } from '../../repository/ICompetitionRepository.repository';
import { Competition } from '../../domain/entities/competition.entity';

export type ListCompetitionsInput = {
  page: number;
  pageSize: number;
};

export type ListCompetitionsOutput = {
  items: Competition[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

@Injectable()
export class ListCompetitionsUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
  ) {}

  async execute(
    input: ListCompetitionsInput,
  ): Promise<ListCompetitionsOutput> {
    const [items, total] = await this.competitionRepository.list(input);

    return {
      items,
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.ceil(total / input.pageSize),
    };
  }
}
