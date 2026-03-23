import { Team } from '../../../domain/entities/team.entity';
import { TeamMember } from '../../../domain/entities/team-member.entity';
import { TeamTypeOrmEntity } from '../entities/team.typeorm-entity';
import { TeamMemberTypeOrmEntity } from '../entities/team-member.typeorm-entity';

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

  static memberToDomain(entity: TeamMemberTypeOrmEntity): TeamMember {
    return TeamMember.restore({
      id: entity.id,
      teamId: entity.teamId,
      athleteId: entity.athleteId,
      createdAt: entity.createdAt,
    });
  }
}
