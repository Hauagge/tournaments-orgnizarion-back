import { describe, expect, it } from 'vitest';
import { makeCompetition } from '../../../../../test/factories';
import { Competition } from '../../domain/entities/competition.entity';
import { CompetitionMode } from '../../domain/value-objects/competition-mode.enum';
import {
  CompetitionDashboardSummaryItem,
  CompetitionDashboardStatus,
} from './dashboard-summary.view';
import { GetDashboardSummaryUseCase } from './get-dashboard-summary.use-case';
import { ICompetitionRepository } from '../../repository/ICompetitionRepository.repository';

class InMemoryCompetitionRepository implements ICompetitionRepository {
  constructor(
    private readonly competitions: Competition[],
    private readonly summary: CompetitionDashboardSummaryItem[],
  ) {}

  async create(competition: Competition): Promise<Competition> {
    return competition;
  }

  async update(competition: Competition): Promise<Competition> {
    return competition;
  }

  async findById(id: number): Promise<Competition | null> {
    return this.competitions.find((competition) => competition.id === id) ?? null;
  }

  async list(): Promise<[Competition[], number]> {
    return [this.competitions, this.competitions.length];
  }

  async listDashboardSummary(input: {
    currentUserId: number;
  }): Promise<CompetitionDashboardSummaryItem[]> {
    return this.summary.filter((item) =>
      input.currentUserId === 99 ? item.competitionId !== 3 : false,
    );
  }
}

describe('GetDashboardSummaryUseCase', () => {
  it('returns compact dashboard metrics for competitions accessible by the user', async () => {
    const repository = new InMemoryCompetitionRepository(
      [
        makeCompetition({ id: 1, mode: CompetitionMode.KEYS }),
        makeCompetition({ id: 2, mode: CompetitionMode.ABSOLUTE_GP }),
      ],
      [
        {
          competitionId: 1,
          name: 'Keys Cup',
          athleteCount: 24,
          areaCount: 3,
          fightsTodayCount: 12,
          status: CompetitionDashboardStatus.IN_PROGRESS,
          ruleTypeLabel: 'Chaves',
        },
        {
          competitionId: 2,
          name: 'Absolute Cup',
          athleteCount: 8,
          areaCount: 1,
          fightsTodayCount: 0,
          status: CompetitionDashboardStatus.READY,
          ruleTypeLabel: 'Absoluto GP',
        },
        {
          competitionId: 3,
          name: 'Hidden Cup',
          athleteCount: 99,
          areaCount: 9,
          fightsTodayCount: 9,
          status: CompetitionDashboardStatus.DRAFT,
          ruleTypeLabel: 'Chaves',
        },
      ],
    );
    const useCase = new GetDashboardSummaryUseCase(repository);

    const result = await useCase.execute({ currentUserId: 99 });

    expect(result).toEqual([
      {
        competitionId: 1,
        name: 'Keys Cup',
        athleteCount: 24,
        areaCount: 3,
        fightsTodayCount: 12,
        status: CompetitionDashboardStatus.IN_PROGRESS,
        ruleTypeLabel: 'Chaves',
      },
      {
        competitionId: 2,
        name: 'Absolute Cup',
        athleteCount: 8,
        areaCount: 1,
        fightsTodayCount: 0,
        status: CompetitionDashboardStatus.READY,
        ruleTypeLabel: 'Absoluto GP',
      },
    ]);
  });
});
