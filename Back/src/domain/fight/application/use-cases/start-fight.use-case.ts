import { Inject, Injectable } from '@nestjs/common';
import { EventBus } from '@/core/events/event-bus.interface';
import { NotFoundError } from '@/shared/errors/not-found.error';
import { ValidationError } from '@/shared/errors/validation.error';
import { FightStatus } from '../../domain/value-objects/fight-status.enum';
import { IFightRepository } from '../../repository/IFightRepository.repository';

@Injectable()
export class StartFightUseCase {
  constructor(
    @Inject(IFightRepository)
    private readonly fightRepository: IFightRepository,
    @Inject(EventBus)
    private readonly eventBus: EventBus,
  ) {}

  async execute(id: number) {
    const fight = await this.fightRepository.findById(id);

    if (!fight) {
      throw new NotFoundError(`Fight with id ${id} not found`);
    }

    if (![FightStatus.WAITING, FightStatus.CALLED].includes(fight.status)) {
      throw new ValidationError(
        'Fight cannot be started from the current status',
      );
    }

    if (!fight.areaId) {
      throw new ValidationError(
        'Fight must have an area assigned before starting',
      );
    }

    const fightsInProgressInArea =
      await this.fightRepository.listByCompetitionId({
        competitionId: fight.competitionId,
        areaId: fight.areaId,
        status: FightStatus.IN_PROGRESS,
      });

    if (fightsInProgressInArea.some((other) => other.id !== fight.id)) {
      throw new ValidationError('This area already has a fight in progress');
    }

    const startedFight = await this.fightRepository.update(
      fight.start(new Date()),
    );

    await this.eventBus.publish({
      name: 'fight.started',
      payload: {
        fightId: startedFight.id as number,
        competitionId: startedFight.competitionId,
        areaId: startedFight.areaId,
      },
      occurredAt: new Date(),
    });

    return startedFight;
  }
}
