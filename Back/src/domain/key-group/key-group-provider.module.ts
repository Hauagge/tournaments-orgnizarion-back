import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademyTypeOrmEntity } from '../academy/infra/persistence/entities/academy.typeorm-entity';
import { AreaTypeOrmEntity } from '../area/infra/persistence/entities/area.typeorm-entity';
import { AthleteTypeOrmEntity } from '../athlete/infra/persistence/entities/athlete.typeorm-entity';
import { CategoryTypeOrmEntity } from '../category/infra/persistence/entities/category.typeorm-entity';
import { FightTypeOrmEntity } from '../fight/entities/fight.typeorm-entity';
import { WeighInTypeOrmEntity } from '../weighin/infra/persistence/entities/weigh-in.typeorm-entity';
import { KeyGroupMemberTypeOrmEntity } from './infra/persistence/entities/key-group-member.typeorm-entity';
import { KeyGroupTypeOrmEntity } from './infra/persistence/entities/key-group.typeorm-entity';
import { KeyGroupRepository } from './infra/persistence/key-group.repository';
import { IKeyGroupRepository } from './repository/IKeyGroupRepository.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      KeyGroupTypeOrmEntity,
      KeyGroupMemberTypeOrmEntity,
      FightTypeOrmEntity,
      AthleteTypeOrmEntity,
      AcademyTypeOrmEntity,
      CategoryTypeOrmEntity,
      AreaTypeOrmEntity,
      WeighInTypeOrmEntity,
    ]),
  ],
  providers: [
    {
      provide: IKeyGroupRepository,
      useClass: KeyGroupRepository,
    },
  ],
  exports: [IKeyGroupRepository],
})
export class KeyGroupProviderModule {}
