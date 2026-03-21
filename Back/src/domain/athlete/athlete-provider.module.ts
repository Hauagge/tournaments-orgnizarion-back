import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AthleteRepository } from './infra/persistence/athlete.repository';
import { AthleteTypeOrmEntity } from './infra/persistence/entities/athlete.typeorm-entity';
import { IAthleteRepository } from './repository/IAthleteRepository.repository';

@Module({
  imports: [TypeOrmModule.forFeature([AthleteTypeOrmEntity])],
  providers: [
    {
      provide: IAthleteRepository,
      useClass: AthleteRepository,
    },
  ],
  exports: [IAthleteRepository],
})
export class AthleteProviderModule {}
