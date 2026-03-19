import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Team } from '../../domain/entities/team.entity';
import { ITeamRepository } from '../../repository/ITeamRepository.repository';
import { TeamTypeOrmEntity } from './entities/team.typeorm-entity';
import { TeamMapper } from './mappers/team.mapper';

@Injectable()
export class TeamRepository implements ITeamRepository {
  constructor(
    @InjectRepository(TeamTypeOrmEntity)
    private readonly repository: Repository<TeamTypeOrmEntity>,
  ) {}

  async create(team: Team): Promise<Team> {
    const entity = this.repository.create(TeamMapper.toPersistence(team));
    const savedEntity = await this.repository.save(entity);
    return TeamMapper.toDomain(savedEntity);
  }

  async findByCompetitionIdAndName(
    competitionId: number,
    name: string,
  ): Promise<Team | null> {
    const entity = await this.repository.findOneBy({
      competitionId,
      name: Team.normalizeName(name),
    });

    return entity ? TeamMapper.toDomain(entity) : null;
  }

  async findByCompetitionIdAndNames(
    competitionId: number,
    names: string[],
  ): Promise<Team[]> {
    const normalizedNames = [...new Set(names.map((name) => Team.normalizeName(name)))];

    if (normalizedNames.length === 0) {
      return [];
    }

    const entities = await this.repository.findBy({
      competitionId,
      name: In(normalizedNames),
    });

    return entities.map((entity) => TeamMapper.toDomain(entity));
  }
}
