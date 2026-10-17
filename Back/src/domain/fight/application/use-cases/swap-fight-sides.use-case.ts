import { Inject, Injectable } from '@nestjs/common';
import { EventBus } from '@/core/events/event-bus.interface';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { IFightRepository } from '../../repository/IFightRepository.repository';

function flipSlot(slot: 'A' | 'B' | null) {
  return slot === 'A' ? 'B' : slot === 'B' ? 'A' : null;
}

export type SwapFightSidesInput = {
  fightId: number;
};

// Troca atleta A e B de lado. As lutas que alimentam esta (vencedor ou
// perdedor) tem o slot de destino invertido junto, senao o proximo resultado
// seria gravado por cima do atleta do outro lado.
@Injectable()
export class SwapFightSidesUseCase {
  constructor(
    @Inject(IFightRepository)
    private readonly fightRepository: IFightRepository,
    @Inject(EventBus)
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: SwapFightSidesInput) {
    const fight = await this.fightRepository.findById(input.fightId);

    if (!fight) {
      throw new NotFoundError(`Fight with id ${input.fightId} not found`);
    }

    const swapped = fight.swapSides();

    const updatedFight = await this.fightRepository.withTransaction(
      async (fights) => {
        const competitionFights = await fights.listByCompetitionId({
          competitionId: fight.competitionId,
        });
        const feeders = competitionFights
          .filter(
            (candidate) =>
              candidate.nextFightId === input.fightId ||
              candidate.loserNextFightId === input.fightId,
          )
          .map((feeder) =>
            feeder.updateDetails({
              nextFightSlot:
                feeder.nextFightId === input.fightId
                  ? flipSlot(feeder.nextFightSlot)
                  : undefined,
              loserNextFightSlot:
                feeder.loserNextFightId === input.fightId
                  ? flipSlot(feeder.loserNextFightSlot)
                  : undefined,
            }),
          );

        if (feeders.length > 0) {
          await fights.updateMany(feeders);
        }

        return fights.update(swapped);
      },
    );

    await this.eventBus.publish({
      name: 'queue.updated',
      payload: {
        competitionId: updatedFight.competitionId,
        areaId: updatedFight.areaId,
        fightId: updatedFight.id as number,
      },
      occurredAt: new Date(),
    });

    return updatedFight;
  }
}
