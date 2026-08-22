import { Competition } from '../domain/entities/competition.entity';
import { CompetitionDashboardSummaryItem } from '../application/use-cases/dashboard-summary.view';

export abstract class ICompetitionRepository {
  abstract create(competition: Competition): Promise<Competition>;
  abstract update(competition: Competition): Promise<Competition>;
  abstract findById(id: number): Promise<Competition | null>;
  abstract list(input: {
    currentUserId: number;
    page: number;
    pageSize: number;
  }): Promise<[Competition[], number]>;
  abstract listDashboardSummary(input: {
    currentUserId: number;
  }): Promise<CompetitionDashboardSummaryItem[]>;
}
