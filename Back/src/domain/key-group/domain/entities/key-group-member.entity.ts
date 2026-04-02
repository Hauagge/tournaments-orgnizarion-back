export type KeyGroupMemberProps = {
  id?: number;
  keyGroupId: number;
  athleteId: number;
  createdAt: Date;
};

export class KeyGroupMember {
  private constructor(private readonly props: KeyGroupMemberProps) {}

  static create(props: Omit<KeyGroupMemberProps, 'id' | 'createdAt'>): KeyGroupMember {
    return new KeyGroupMember({
      ...props,
      createdAt: new Date(),
    });
  }

  static restore(props: KeyGroupMemberProps): KeyGroupMember {
    return new KeyGroupMember(props);
  }

  toJSON(): KeyGroupMemberProps {
    return { ...this.props };
  }

  get id(): number | undefined { return this.props.id; }
  get keyGroupId(): number { return this.props.keyGroupId; }
  get athleteId(): number { return this.props.athleteId; }
  get createdAt(): Date { return this.props.createdAt; }
}
