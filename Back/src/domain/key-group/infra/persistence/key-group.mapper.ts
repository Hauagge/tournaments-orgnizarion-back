import { KeyGroup } from '../../domain/entities/key-group.entity';
import { KeyGroupMember } from '../../domain/entities/key-group-member.entity';
import { KeyGroupMemberTypeOrmEntity } from './entities/key-group-member.typeorm-entity';
import { KeyGroupTypeOrmEntity } from './entities/key-group.typeorm-entity';

export class KeyGroupMapper {
  static toDomain(entity: KeyGroupTypeOrmEntity): KeyGroup {
    return KeyGroup.restore({
      id: entity.id,
      competitionId: entity.competitionId,
      categoryId: entity.categoryId,
      name: entity.name,
      status: entity.status,
      createdAt: entity.createdAt,
    });
  }

  static toPersistence(group: KeyGroup): KeyGroupTypeOrmEntity {
    const entity = new KeyGroupTypeOrmEntity();
    entity.id = group.id as number;
    entity.competitionId = group.competitionId;
    entity.categoryId = group.categoryId;
    entity.name = group.name;
    entity.status = group.status;
    entity.createdAt = group.createdAt;
    return entity;
  }

  static memberToDomain(entity: KeyGroupMemberTypeOrmEntity): KeyGroupMember {
    return KeyGroupMember.restore({
      id: entity.id,
      keyGroupId: entity.keyGroupId,
      athleteId: entity.athleteId,
      createdAt: entity.createdAt,
    });
  }
}
