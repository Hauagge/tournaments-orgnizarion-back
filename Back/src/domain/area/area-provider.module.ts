import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AreaTypeOrmEntity } from './infra/persistence/entities/area.typeorm-entity';
import { AreaQueueItemTypeOrmEntity } from './infra/persistence/entities/area-queue-item.typeorm-entity';
import { AreaRepository } from './infra/persistence/area.repository';
import { IAreaRepository } from './repository/IAreaRepository.repository';
import { IAreaQueueItemRepository } from './repository/IAreaQueueItemRepository.repository';

@Module({
  imports: [TypeOrmModule.forFeature([AreaTypeOrmEntity, AreaQueueItemTypeOrmEntity])],
  providers: [
    AreaRepository,
    {
      provide: IAreaRepository,
      useExisting: AreaRepository,
    },
    {
      provide: IAreaQueueItemRepository,
      useExisting: AreaRepository,
    },
  ],
  exports: [IAreaRepository, IAreaQueueItemRepository],
})
export class AreaProviderModule {}
