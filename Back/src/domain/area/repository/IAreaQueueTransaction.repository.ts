import { IFightRepository } from '@/domain/fight/repository/IFightRepository.repository';
import { IAreaQueueItemRepository } from './IAreaQueueItemRepository.repository';

export type AreaQueueTransactionRepositories = {
  areaQueueItems: IAreaQueueItemRepository;
  fights: IFightRepository;
};

// A fila da area (area_queue_items) e a area da luta (fights.area_id) precisam
// mudar juntas: se uma gravacao falhar no meio, a luta nao pode ficar fora de
// qualquer fila ou apontando para uma area onde nao esta.
export abstract class IAreaQueueTransaction {
  abstract run<T>(
    work: (repositories: AreaQueueTransactionRepositories) => Promise<T>,
  ): Promise<T>;
}
