import { Injectable, Logger } from '@nestjs/common';
import {
  DomainEvent,
  DomainEventHandler,
  EventBus,
} from './event-bus.interface';

@Injectable()
export class InMemoryEventBus implements EventBus {
  private readonly logger = new Logger(InMemoryEventBus.name);
  private readonly handlers = new Map<string, Set<DomainEventHandler>>();

  async publish(event: DomainEvent): Promise<void> {
    this.logger.log(`${event.name} ${JSON.stringify(event.payload)}`);

     const handlers = this.handlers.get(event.name) ?? new Set<DomainEventHandler>();
     for (const handler of handlers) {
       await handler(event);
     }
  }

  subscribe(eventName: string, handler: DomainEventHandler): () => void {
    const handlers = this.handlers.get(eventName) ?? new Set<DomainEventHandler>();
    handlers.add(handler);
    this.handlers.set(eventName, handlers);

    return () => {
      const registeredHandlers = this.handlers.get(eventName);
      if (!registeredHandlers) {
        return;
      }

      registeredHandlers.delete(handler);
      if (registeredHandlers.size === 0) {
        this.handlers.delete(eventName);
      }
    };
  }
}
