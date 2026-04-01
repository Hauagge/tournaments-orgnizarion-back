import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { WeighInStatus } from '@/domain/weighin/domain/value-objects/weigh-in-status.enum';
import {
  ITeamRepository,
  TeamCompetitionRosterItem,
} from '../../repository/ITeamRepository.repository';
import { Team } from '../../domain/entities/team.entity';
import { TeamMember } from '../../domain/entities/team-member.entity';
import { TeamMemberTypeOrmEntity } from './entities/team-member.typeorm-entity';
import { TeamTypeOrmEntity } from './entities/team.typeorm-entity';
import { TeamMapper } from './mappers/team.mapper';

type TeamRosterRow = {
  team_id: number;
  team_name: string;
  athlete_id: number | null;
  athlete_full_name: string | null;
  athlete_belt: string | null;
  athlete_declared_weight_grams: number | null;
  academy_name: string | null;
  weigh_in_status: WeighInStatus | null;
};

@Injectable()
export class TeamRepository implements ITeamRepository {
  constructor(
    @InjectRepository(TeamTypeOrmEntity)
    private readonly teamRepository: Repository<TeamTypeOrmEntity>,
    @InjectRepository(TeamMemberTypeOrmEntity)
    private readonly teamMemberRepository: Repository<TeamMemberTypeOrmEntity>,
  ) {}

  async create(team: Team, athleteIds: number[]): Promise<Team> {
    const savedTeam = await this.teamRepository.save(
      this.teamRepository.create(TeamMapper.toPersistence(team)),
    );

    if (athleteIds.length) {
      await this.teamMemberRepository.save(
        athleteIds.map((athleteId) =>
          this.teamMemberRepository.create({
            teamId: savedTeam.id,
            athleteId,
          }),
        ),
      );
    }

    return TeamMapper.toDomain(savedTeam);
  }

  async update(team: Team): Promise<Team> {
    const result = await this.teamRepository.update(
      { id: team.id as number },
      TeamMapper.toPersistence(team),
    );

    if (!result.affected) {
      throw new NotFoundError(`Team with id ${team.id as number} not found`);
    }

    return team;
  }

  async findById(id: number): Promise<Team | null> {
    const entity = await this.teamRepository.findOneBy({ id });
    return entity ? TeamMapper.toDomain(entity) : null;
  }

  async listByCompetitionId(
    competitionId: number,
    includes: string[] = [],
  ): Promise<Team[]> {
    const entities = await this.teamRepository.find({
      where: { competitionId },
      order: { createdAt: 'ASC' },
      relations: includes,
    });

    return entities.map(TeamMapper.toDomain);
  }

  async listRosterByCompetitionId(
    competitionId: number,
  ): Promise<TeamCompetitionRosterItem[]> {
    const rows = await this.teamRepository
      .createQueryBuilder('team')
      .leftJoin('team_members', 'member', 'member.team_id = team.id')
      .leftJoin('athletes', 'athlete', 'athlete.id = member.athlete_id')
      .leftJoin('academies', 'academy', 'academy.id = athlete.academy_id')
      .leftJoin(
        'weigh_ins',
        'weigh_in',
        'weigh_in.competition_id = team.competition_id AND weigh_in.athlete_id = athlete.id',
      )
      .where('team.competition_id = :competitionId', { competitionId })
      .orderBy('team.created_at', 'ASC')
      .addOrderBy('member.created_at', 'ASC')
      .addOrderBy('athlete.full_name', 'ASC')
      .select('team.id', 'team_id')
      .addSelect('team.name', 'team_name')
      .addSelect('athlete.id', 'athlete_id')
      .addSelect('athlete.full_name', 'athlete_full_name')
      .addSelect('athlete.belt', 'athlete_belt')
      .addSelect('athlete.declared_weight_grams', 'athlete_declared_weight_grams')
      .addSelect('academy.name', 'academy_name')
      .addSelect('weigh_in.status', 'weigh_in_status')
      .getRawMany<TeamRosterRow>();

    const teamsById = new Map<number, TeamCompetitionRosterItem>();

    for (const row of rows) {
      let team = teamsById.get(row.team_id);
      if (!team) {
        team = {
          id: row.team_id,
          name: row.team_name,
          athletes: [],
        };
        teamsById.set(row.team_id, team);
      }

      if (row.athlete_id === null) {
        continue;
      }

      team.athletes.push({
        id: row.athlete_id,
        fullName: row.athlete_full_name ?? '',
        belt: row.athlete_belt ?? '',
        declaredWeightGrams: Number(row.athlete_declared_weight_grams ?? 0),
        academyName: row.academy_name,
        weighInStatus: row.weigh_in_status ?? WeighInStatus.PENDING,
      });
    }

    return Array.from(teamsById.values());
  }

  async countByCompetitionId(competitionId: number): Promise<number> {
    return this.teamRepository.count({
      where: { competitionId },
    });
  }

  async listMembersByTeamId(teamId: number): Promise<TeamMember[]> {
    const entities = await this.teamMemberRepository.find({
      where: { teamId },
      order: { createdAt: 'ASC' },
    });

    return entities.map(TeamMapper.memberToDomain);
  }

  async findByCompetitionIdAndAthleteId(
    competitionId: number,
    athleteId: number,
  ): Promise<Team | null> {
    const entity = await this.teamRepository
      .createQueryBuilder('team')
      .innerJoin('team.members', 'member')
      .where('team.competition_id = :competitionId', { competitionId })
      .andWhere('member.athlete_id = :athleteId', { athleteId })
      .getOne();

    return entity ? TeamMapper.toDomain(entity) : null;
  }

  async addMember(teamId: number, athleteId: number): Promise<TeamMember> {
    const entity = await this.teamMemberRepository.save(
      this.teamMemberRepository.create({ teamId, athleteId }),
    );

    return TeamMapper.memberToDomain(entity);
  }

  async removeMember(teamId: number, athleteId: number): Promise<void> {
    await this.teamMemberRepository.delete({ teamId, athleteId });
  }
}
