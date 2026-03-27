export type DomainEvent = {
  name: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
};

export abstract class EventBus {
  abstract publish(event: DomainEvent): Promise<void>;
}
