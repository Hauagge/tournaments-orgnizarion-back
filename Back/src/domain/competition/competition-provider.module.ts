import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompetitionRepository } from './infra/persistence/competition.repository';
import { CompetitionTypeOrmEntity } from './infra/persistence/entities/competition.typeorm-entity';
import { ICompetitionRepository } from './repository/ICompetitionRepository.repository';

@Module({
  imports: [TypeOrmModule.forFeature([CompetitionTypeOrmEntity])],
  providers: [
    {
      provide: ICompetitionRepository,
      useClass: CompetitionRepository,
    },
  ],
  exports: [ICompetitionRepository],
})
export class CompetitionProviderModule {}
