export type AcademyProps = {
  id?: number;
  competitionId: number;
  name: string;
  createdAt: Date;
};

type UpdateAcademyProps = Partial<Pick<AcademyProps, 'name'>>;

export class Academy {
  private constructor(private readonly props: AcademyProps) {}

  static create(props: Omit<AcademyProps, 'id' | 'createdAt'>): Academy {
    return new Academy({
      ...props,
      name: Academy.normalizeName(props.name),
      createdAt: new Date(),
    });
  }

  static restore(props: AcademyProps): Academy {
    return new Academy({
      ...props,
      name: Academy.normalizeName(props.name),
    });
  }

  update(input: UpdateAcademyProps): Academy {
    return new Academy({
      ...this.props,
      name:
        input.name === undefined
          ? this.props.name
          : Academy.normalizeName(input.name),
    });
  }

  static normalizeName(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  toJSON(): AcademyProps {
    return {
      id: this.id,
      competitionId: this.competitionId,
      name: this.name,
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

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
