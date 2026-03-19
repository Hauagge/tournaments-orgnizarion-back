import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamRepository } from './infra/persistence/team.repository';
import { TeamTypeOrmEntity } from './infra/persistence/entities/team.typeorm-entity';
import { ITeamRepository } from './repository/ITeamRepository.repository';

@Module({
  imports: [TypeOrmModule.forFeature([TeamTypeOrmEntity])],
  providers: [
    {
      provide: ITeamRepository,
      useClass: TeamRepository,
    },
  ],
  exports: [ITeamRepository],
})
export class TeamModule {}
