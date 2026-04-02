import { Inject, Injectable } from '@nestjs/common';
import { Competition } from '../../domain/entities/competition.entity';
import { ICompetitionRepository } from '../../repository/ICompetitionRepository.repository';
import { CompetitionTeamsHydratorService } from '../services/competition-teams-hydrator.service';

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
    private readonly competitionTeamsHydrator: CompetitionTeamsHydratorService,
  ) {}

  async execute(
    input: ListCompetitionsInput,
  ): Promise<ListCompetitionsOutput> {
    const [items, total] = await this.competitionRepository.list(input);
    const hydratedItems = await this.competitionTeamsHydrator.attachTeamsToMany(items);

    return {
      items: hydratedItems,
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.ceil(total / input.pageSize),
    };
  }
}
