import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCompetitionTypeOrmEntity } from '@/domain/auth/entities/user-competition.typeorm-entity';
import { FightStatus } from '@/domain/fight/domain/value-objects/fight-status.enum';
import { NotFoundError } from 'src/shared/errors/not-found.error';
import {
  CompetitionDashboardStatus,
  CompetitionDashboardSummaryItem,
} from '../../application/use-cases/dashboard-summary.view';
import { CompetitionMode } from '../../domain/value-objects/competition-mode.enum';
import { Competition } from '../../domain/entities/competition.entity';
import { ICompetitionRepository } from '../../repository/ICompetitionRepository.repository';
import { CompetitionTypeOrmEntity } from './entities/competition.typeorm-entity';
import { CompetitionMapper } from './mappers/competition.mapper';

@Injectable()
export class CompetitionRepository implements ICompetitionRepository {
  constructor(
    @InjectRepository(CompetitionTypeOrmEntity)
    private readonly repository: Repository<CompetitionTypeOrmEntity>,
  ) {}

  async create(competition: Competition): Promise<Competition> {
    const entity = this.repository.create(
      CompetitionMapper.toPersistence(competition),
    );
    const savedEntity = await this.repository.save(entity);
    return CompetitionMapper.toDomain(savedEntity);
  }

  async update(competition: Competition): Promise<Competition> {
    await this.repository.update(competition.id as number, {
      name: competition.name,
      mode: competition.mode,
      fightDurationSeconds: competition.fightDurationSeconds,
      weighInMarginGrams: competition.weighInMarginGrams,
      ageSplitYears: competition.ageSplitYears,
    });

    const updatedEntity = await this.repository.findOneBy({
      id: competition.id as number,
    });

    if (!updatedEntity) {
      throw new NotFoundError(
        `Competition with id ${competition.id as number} not found`,
      );
    }

    return CompetitionMapper.toDomain(updatedEntity);
  }

  async findById(id: number): Promise<Competition | null> {
    const entity = await this.repository.findOneBy({ id });
    return entity ? CompetitionMapper.toDomain(entity) : null;
  }

  async list(input: {
    currentUserId: number;
    page: number;
    pageSize: number;
  }): Promise<[Competition[], number]> {
    const [entities, total] = await this.repository
      .createQueryBuilder('competition')
      .innerJoin(
        UserCompetitionTypeOrmEntity,
        'userCompetition',
        'userCompetition.competition_id = competition.id AND userCompetition.user_id = :currentUserId',
        { currentUserId: input.currentUserId },
      )
      .orderBy('competition.createdAt', 'DESC')
      .skip((input.page - 1) * input.pageSize)
      .take(input.pageSize)
      .getManyAndCount();

    return [entities.map(CompetitionMapper.toDomain), total];
  }

  async listDashboardSummary(input: {
    currentUserId: number;
  }): Promise<CompetitionDashboardSummaryItem[]> {
    const rows = await this.repository
      .createQueryBuilder('competition')
      .innerJoin(
        UserCompetitionTypeOrmEntity,
        'userCompetition',
        'userCompetition.competition_id = competition.id AND userCompetition.user_id = :currentUserId',
        { currentUserId: input.currentUserId },
      )
      .leftJoin(
        'athletes',
        'athlete',
        'athlete.competition_id = competition.id',
      )
      .leftJoin(
        'areas',
        'area',
        'area.competition_id = competition.id',
      )
      .leftJoin(
        'fights',
        'fight',
        'fight.competition_id = competition.id',
      )
      .select('competition.id', 'competitionId')
      .addSelect('competition.name', 'name')
      .addSelect('competition.mode', 'mode')
      .addSelect('COUNT(DISTINCT athlete.id)', 'athleteCount')
      .addSelect('COUNT(DISTINCT area.id)', 'areaCount')
      .addSelect('COUNT(DISTINCT fight.id)', 'fightCount')
      .addSelect(
        `COUNT(DISTINCT CASE
          WHEN DATE(fight.started_at) = CURRENT_DATE
            OR DATE(fight.finished_at) = CURRENT_DATE
          THEN fight.id
        END)`,
        'fightsTodayCount',
      )
      .addSelect(
        `COUNT(DISTINCT CASE
          WHEN fight.status IN (:...activeStatuses)
          THEN fight.id
        END)`,
        'activeFightCount',
      )
      .addSelect(
        `COUNT(DISTINCT CASE
          WHEN fight.status IN (:...terminalStatuses)
          THEN fight.id
        END)`,
        'terminalFightCount',
      )
      .setParameters({
        activeStatuses: [FightStatus.CALLED, FightStatus.IN_PROGRESS],
        terminalStatuses: [FightStatus.FINISHED, FightStatus.CANCELED],
      })
      .groupBy('competition.id')
      .addGroupBy('competition.name')
      .addGroupBy('competition.mode')
      .orderBy('competition.createdAt', 'DESC')
      .getRawMany<{
        competitionId: string;
        name: string;
        mode: CompetitionMode;
        athleteCount: string;
        areaCount: string;
        fightCount: string;
        fightsTodayCount: string;
        activeFightCount: string;
        terminalFightCount: string;
      }>();

    return rows.map((row) => {
      const fightCount = Number(row.fightCount);
      const terminalFightCount = Number(row.terminalFightCount);
      const activeFightCount = Number(row.activeFightCount);

      return {
        competitionId: Number(row.competitionId),
        name: row.name,
        athleteCount: Number(row.athleteCount),
        areaCount: Number(row.areaCount),
        fightsTodayCount: Number(row.fightsTodayCount),
        status: this.deriveDashboardStatus({
          fightCount,
          activeFightCount,
          terminalFightCount,
        }),
        ruleTypeLabel: this.getRuleTypeLabel(row.mode),
      };
    });
  }

  private deriveDashboardStatus(input: {
    fightCount: number;
    activeFightCount: number;
    terminalFightCount: number;
  }): CompetitionDashboardStatus {
    if (input.fightCount === 0) {
      return CompetitionDashboardStatus.DRAFT;
    }

    if (input.terminalFightCount === input.fightCount) {
      return CompetitionDashboardStatus.FINISHED;
    }

    if (input.activeFightCount > 0 || input.terminalFightCount > 0) {
      return CompetitionDashboardStatus.IN_PROGRESS;
    }

    return CompetitionDashboardStatus.READY;
  }

  private getRuleTypeLabel(mode: CompetitionMode): string {
    if (mode === CompetitionMode.ABSOLUTE_GP) {
      return 'Absoluto GP';
    }

    return 'Chaves';
  }
}
