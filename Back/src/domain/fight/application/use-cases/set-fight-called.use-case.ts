import { Inject, Injectable } from '@nestjs/common';
import { EventBus } from '@/core/events/event-bus.interface';
import { IAreaQueueTransaction } from '@/domain/area/repository/IAreaQueueTransaction.repository';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { IFightRepository } from '../../repository/IFightRepository.repository';

export type SetFightCalledInput = {
  fightId: number;
  called: boolean;
};

// Marca (ou desmarca) uma luta especifica como chamada. Diferente do
// "chamar proxima", aqui o operador escolhe a luta e a area pode ter varias
// chamadas ao mesmo tempo.
@Injectable()
export class SetFightCalledUseCase {
  constructor(
    @Inject(IFightRepository)
    private readonly fightRepository: IFightRepository,
    @Inject(IAreaQueueTransaction)
    private readonly areaQueueTransaction: IAreaQueueTransaction,
    @Inject(EventBus)
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: SetFightCalledInput) {
    const fight = await this.fightRepository.findById(input.fightId);

    if (!fight) {
      throw new NotFoundError(`Fight with id ${input.fightId} not found`);
    }

    if (
      input.called &&
      (fight.athleteAId === null || fight.athleteBId === null)
    ) {
      throw new ValidationError('Fight requires two athletes before calling');
    }

    // Luta e item da fila mudam juntos: se um falhar, o outro nao fica com
    // status diferente.
    const { updatedFight, updatedQueueItem } =
      await this.areaQueueTransaction.run(
        async ({ fights, areaQueueItems }) => {
          const queueItem = await areaQueueItems.findByFightId(input.fightId);

          if (!queueItem) {
            throw new ValidationError(
              'Fight must be in an area queue before changing its call status',
            );
          }

          return {
            updatedFight: await fights.update(
              input.called ? fight.call() : fight.uncall(),
            ),
            updatedQueueItem: await areaQueueItems.update(
              input.called ? queueItem.call() : queueItem.requeue(),
            ),
          };
        },
      );

    await this.eventBus.publish({
      name: 'queue.updated',
      payload: {
        competitionId: updatedFight.competitionId,
        areaId: updatedQueueItem.areaId,
        fightId: updatedFight.id as number,
        queueItemId: updatedQueueItem.id as number,
        status: updatedQueueItem.status,
      },
      occurredAt: new Date(),
    });

    return updatedFight;
  }
}
