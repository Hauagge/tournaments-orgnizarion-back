import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AreaTypeOrmEntity } from './infra/persistence/entities/area.typeorm-entity';
import { AreaQueueItemTypeOrmEntity } from './infra/persistence/entities/area-queue-item.typeorm-entity';
import { AreaRepository } from './infra/persistence/area.repository';
import { TypeOrmAreaQueueTransaction } from './infra/persistence/typeorm-area-queue-transaction';
import { IAreaRepository } from './repository/IAreaRepository.repository';
import { IAreaQueueItemRepository } from './repository/IAreaQueueItemRepository.repository';
import { IAreaQueueTransaction } from './repository/IAreaQueueTransaction.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([AreaTypeOrmEntity, AreaQueueItemTypeOrmEntity]),
  ],
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
    {
      provide: IAreaQueueTransaction,
      useClass: TypeOrmAreaQueueTransaction,
    },
  ],
  exports: [IAreaRepository, IAreaQueueItemRepository, IAreaQueueTransaction],
})
export class AreaProviderModule {}
