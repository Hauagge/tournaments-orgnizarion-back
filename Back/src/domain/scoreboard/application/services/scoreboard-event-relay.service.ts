import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DomainEvent, EventBus } from '@/core/events/event-bus.interface';
import { ScoreboardGateway } from '../../scoreboard.gateway';

@Injectable()
export class ScoreboardEventRelayService implements OnModuleInit, OnModuleDestroy {
  private readonly unsubscribers: Array<() => void> = [];
  private readonly relayedEvents = [
    'fight.started',
    'fight.finished',
    'queue.updated',
    'nextfight.updated',
  ] as const;

  constructor(
    @Inject(EventBus)
    private readonly eventBus: EventBus,
    private readonly gateway: ScoreboardGateway,
  ) {}

  onModuleInit() {
    for (const eventName of this.relayedEvents) {
      const unsubscribe = this.eventBus.subscribe(eventName, (event) =>
        this.relay(event),
      );
      this.unsubscribers.push(unsubscribe);
    }
  }

  onModuleDestroy() {
    while (this.unsubscribers.length > 0) {
      const unsubscribe = this.unsubscribers.pop();
      unsubscribe?.();
    }
  }

  private relay(event: DomainEvent) {
    const competitionId = this.toNumber(event.payload.competitionId);
    const areaId = this.toNumber(event.payload.areaId);

    if (competitionId !== null) {
      this.gateway.broadcastToCompetition(event.name, competitionId, event.payload);
    }

    if (areaId !== null) {
      this.gateway.broadcastToArea(event.name, areaId, event.payload);
    }
  }

  private toNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }
}
