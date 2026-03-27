import { Module } from '@nestjs/common';
import { EventBus } from './event-bus.interface';
import { InMemoryEventBus } from './in-memory-event-bus.service';

@Module({
  providers: [
    InMemoryEventBus,
    {
      provide: EventBus,
      useExisting: InMemoryEventBus,
    },
  ],
  exports: [EventBus],
})
export class EventBusModule {}
