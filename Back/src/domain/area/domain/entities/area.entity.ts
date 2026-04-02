export type AreaProps = {
  id?: number;
  competitionId: number;
  name: string;
  order: number;
  createdAt: Date;
};

export class Area {
  private constructor(private readonly props: AreaProps) {}

  static create(props: Omit<AreaProps, 'id' | 'createdAt'>): Area {
    return new Area({
      ...props,
      name: Area.normalizeName(props.name),
      createdAt: new Date(),
    });
  }

  static restore(props: AreaProps): Area {
    return new Area({
      ...props,
      name: Area.normalizeName(props.name),
    });
  }

  static normalizeName(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  toJSON(): AreaProps {
    return {
      id: this.id,
      competitionId: this.competitionId,
      name: this.name,
      order: this.order,
      createdAt: this.createdAt,
    };
  }

  get id(): number | undefined {
    return this.props.id;
  }

  get competitionId(): number {
    return this.props.competitionId;
  }

  get name(): string {
    return this.props.name;
  }

  get order(): number {
    return this.props.order;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
