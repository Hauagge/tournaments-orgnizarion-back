import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamTypeOrmEntity } from './infra/persistence/entities/team.typeorm-entity';
import { TeamRepository } from './infra/persistence/team.repository';
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
export class TeamProviderModule {}
