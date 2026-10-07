import { IAreaQueueItemRepository } from '@/domain/area/repository/IAreaQueueItemRepository.repository';
import {
  AreaQueueTransactionRepositories,
  IAreaQueueTransaction,
} from '@/domain/area/repository/IAreaQueueTransaction.repository';
import { IFightRepository } from '@/domain/fight/repository/IFightRepository.repository';

// Fakes que sabem fotografar o proprio estado e devolver uma funcao que o
// restaura (ver snapshot() nos repositorios em memoria).
type Rollbackable<T> = T & { snapshot(): () => void };

// Simula o rollback do banco: se o trabalho falhar, fila e lutas voltam ao
// estado de antes da transacao.
export class InMemoryAreaQueueTransaction implements IAreaQueueTransaction {
  constructor(
    private readonly areaQueueItems: Rollbackable<IAreaQueueItemRepository>,
    private readonly fights: Rollbackable<IFightRepository>,
  ) {}

  async run<T>(
    work: (repositories: AreaQueueTransactionRepositories) => Promise<T>,
  ): Promise<T> {
    const restoreQueue = this.areaQueueItems.snapshot();
    const restoreFights = this.fights.snapshot();

    try {
      return await work({
        areaQueueItems: this.areaQueueItems,
        fights: this.fights,
      });
    } catch (error) {
      restoreQueue();
      restoreFights();
      throw error;
    }
  }
}
