import { describe, expect, it, vi } from 'vitest';
import { DataSource, EntityManager } from 'typeorm';
import { FightTypeOrmEntity } from '@/domain/fight/entities/fight.typeorm-entity';
import { FightRepository } from '@/domain/fight/infra/persistence/fight.repository';
import { AreaRepository } from './area.repository';
import { AreaTypeOrmEntity } from './entities/area.typeorm-entity';
import { AreaQueueItemTypeOrmEntity } from './entities/area-queue-item.typeorm-entity';
import { TypeOrmAreaQueueTransaction } from './typeorm-area-queue-transaction';

describe('TypeOrmAreaQueueTransaction', () => {
  function makeSut() {
    const manager = {
      getRepository: vi.fn((entity: unknown) => ({ entity })),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: vi.fn(
        (work: (transactionManager: EntityManager) => Promise<unknown>) =>
          work(manager),
      ),
    } as unknown as DataSource;

    return {
      sut: new TypeOrmAreaQueueTransaction(dataSource),
      dataSource,
      manager,
    };
  }

  it('entrega repositorios de fila e de luta presos ao EntityManager da transacao', async () => {
    const { sut, dataSource, manager } = makeSut();
    const work = vi.fn(async () => 'ok');

    const result = await sut.run(work);

    expect(result).toBe('ok');
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(manager.getRepository).toHaveBeenCalledWith(AreaTypeOrmEntity);
    expect(manager.getRepository).toHaveBeenCalledWith(
      AreaQueueItemTypeOrmEntity,
    );
    expect(manager.getRepository).toHaveBeenCalledWith(FightTypeOrmEntity);
    const [repositories] = work.mock.calls[0] as unknown as [
      { areaQueueItems: unknown; fights: unknown },
    ];
    expect(repositories.areaQueueItems).toBeInstanceOf(AreaRepository);
    expect(repositories.fights).toBeInstanceOf(FightRepository);
  });

  it('propaga o erro do trabalho para o DataSource fazer rollback', async () => {
    const { sut } = makeSut();

    await expect(
      sut.run(async () => {
        throw new Error('conexao caiu');
      }),
    ).rejects.toThrow('conexao caiu');
  });
});
