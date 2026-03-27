import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent, EventBus } from './event-bus.interface';

@Injectable()
export class InMemoryEventBus implements EventBus {
  private readonly logger = new Logger(InMemoryEventBus.name);

  async publish(event: DomainEvent): Promise<void> {
    this.logger.log(`${event.name} ${JSON.stringify(event.payload)}`);
  }
}
