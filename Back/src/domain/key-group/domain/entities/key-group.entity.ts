import { KeyGroupStatus } from '../value-objects/key-group-status.enum';

export type KeyGroupProps = {
  id?: number;
  competitionId: number;
  categoryId: number | null;
  name: string | null;
  status: KeyGroupStatus;
  createdAt: Date;
};

export class KeyGroup {
  private constructor(private readonly props: KeyGroupProps) {}

  static create(props: Omit<KeyGroupProps, 'id' | 'status' | 'createdAt'>): KeyGroup {
    return new KeyGroup({
      ...props,
      name: props.name?.trim() || null,
      status: KeyGroupStatus.DRAFT,
      createdAt: new Date(),
    });
  }

  static restore(props: KeyGroupProps): KeyGroup {
    return new KeyGroup({
      ...props,
      name: props.name?.trim() || null,
    });
  }

  markDraft(): KeyGroup {
    return new KeyGroup({ ...this.props, status: KeyGroupStatus.DRAFT });
  }

  markReady(): KeyGroup {
    return new KeyGroup({ ...this.props, status: KeyGroupStatus.READY });
  }

  lock(): KeyGroup {
    return new KeyGroup({ ...this.props, status: KeyGroupStatus.LOCKED });
  }

  update(input: {
    categoryId?: number | null;
    name?: string | null;
    status?: KeyGroupStatus;
  }): KeyGroup {
    return new KeyGroup({
      ...this.props,
      categoryId:
        input.categoryId !== undefined ? input.categoryId : this.props.categoryId,
      name: input.name !== undefined ? input.name?.trim() || null : this.props.name,
      status: input.status ?? this.props.status,
    });
  }

  rename(name: string | null): KeyGroup {
    return new KeyGroup({ ...this.props, name: name?.trim() || null });
  }

  toJSON(): KeyGroupProps {
    return { ...this.props };
  }

  get id(): number | undefined { return this.props.id; }
  get competitionId(): number { return this.props.competitionId; }
  get categoryId(): number | null { return this.props.categoryId; }
  get name(): string | null { return this.props.name; }
  get status(): KeyGroupStatus { return this.props.status; }
  get createdAt(): Date { return this.props.createdAt; }
}
