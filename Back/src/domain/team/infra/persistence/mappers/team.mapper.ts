import { Team } from '../../../domain/entities/team.entity';
import { TeamTypeOrmEntity } from '../entities/team.typeorm-entity';

export class TeamMapper {
  static toDomain(entity: TeamTypeOrmEntity): Team {
    return Team.restore({
      id: entity.id,
      competitionId: entity.competitionId,
      name: entity.name,
      createdAt: entity.createdAt,
    });
  }

  static toPersistence(team: Team): TeamTypeOrmEntity {
    const entity = new TeamTypeOrmEntity();
    entity.id = team.id as number;
    entity.competitionId = team.competitionId;
    entity.name = team.name;
    entity.createdAt = team.createdAt;
    return entity;
  }
}
