import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FightTypeOrmEntity } from '@/domain/fight/entities/fight.typeorm-entity';
import { FightRepository } from '@/domain/fight/infra/persistence/fight.repository';
import {
  AreaQueueTransactionRepositories,
  IAreaQueueTransaction,
} from '../../repository/IAreaQueueTransaction.repository';
import { AreaRepository } from './area.repository';
import { AreaTypeOrmEntity } from './entities/area.typeorm-entity';
import { AreaQueueItemTypeOrmEntity } from './entities/area-queue-item.typeorm-entity';

// Mesmo padrao de FightRepository.withTransaction: os repositorios entregues
// ao trabalho usam o EntityManager da transacao, entao tudo vira COMMIT ou
// ROLLBACK junto.
@Injectable()
export class TypeOrmAreaQueueTransaction implements IAreaQueueTransaction {
  constructor(private readonly dataSource: DataSource) {}

  run<T>(
    work: (repositories: AreaQueueTransactionRepositories) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction((manager) =>
      work({
        areaQueueItems: new AreaRepository(
          manager.getRepository(AreaTypeOrmEntity),
          manager.getRepository(AreaQueueItemTypeOrmEntity),
        ),
        fights: new FightRepository(manager.getRepository(FightTypeOrmEntity)),
      }),
    );
  }
}
