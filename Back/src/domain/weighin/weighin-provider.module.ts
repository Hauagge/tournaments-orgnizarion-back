import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WeighInRepository } from './infra/persistence/weigh-in.repository';
import { WeighInTypeOrmEntity } from './infra/persistence/entities/weigh-in.typeorm-entity';
import { IWeighInRepository } from './repository/IWeighInRepository.repository';

@Module({
  imports: [TypeOrmModule.forFeature([WeighInTypeOrmEntity])],
  providers: [
    {
      provide: IWeighInRepository,
      useClass: WeighInRepository,
    },
  ],
  exports: [IWeighInRepository],
})
export class WeighInProviderModule {}
