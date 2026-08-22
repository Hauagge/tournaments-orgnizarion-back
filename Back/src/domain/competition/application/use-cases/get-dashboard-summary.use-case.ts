import { Inject, Injectable } from '@nestjs/common';
import { ICompetitionRepository } from '../../repository/ICompetitionRepository.repository';
import { CompetitionDashboardSummaryItem } from './dashboard-summary.view';

export type GetDashboardSummaryInput = {
  currentUserId: number;
};

@Injectable()
export class GetDashboardSummaryUseCase {
  constructor(
    @Inject(ICompetitionRepository)
    private readonly competitionRepository: ICompetitionRepository,
  ) {}

  async execute(
    input: GetDashboardSummaryInput,
  ): Promise<CompetitionDashboardSummaryItem[]> {
    return this.competitionRepository.listDashboardSummary(input);
  }
}
