import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FightTypeOrmEntity } from './entities/fight.typeorm-entity';
import { FightRepository } from './infra/persistence/fight.repository';
import { IFightRepository } from './repository/IFightRepository.repository';

@Module({
  imports: [TypeOrmModule.forFeature([FightTypeOrmEntity])],
  providers: [
    {
      provide: IFightRepository,
      useClass: FightRepository,
    },
  ],
  exports: [IFightRepository],
})
export class FightProviderModule {}
