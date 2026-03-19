export type TeamProps = {
  id?: number;
  competitionId: number;
  name: string;
  createdAt: Date;
};

export class Team {
  private constructor(private readonly props: TeamProps) {}

  static create(props: Omit<TeamProps, 'id' | 'createdAt'>): Team {
    return new Team({
      ...props,
      name: Team.normalizeName(props.name),
      createdAt: new Date(),
    });
  }

  static restore(props: TeamProps): Team {
    return new Team({
      ...props,
      name: Team.normalizeName(props.name),
    });
  }

  static normalizeName(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  toJSON(): TeamProps {
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
