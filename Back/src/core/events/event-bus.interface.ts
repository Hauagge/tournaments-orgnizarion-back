export type DomainEvent = {
  name: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
};

export type DomainEventHandler = (event: DomainEvent) => Promise<void> | void;

export abstract class EventBus {
  abstract publish(event: DomainEvent): Promise<void>;
  abstract subscribe(eventName: string, handler: DomainEventHandler): () => void;
}
