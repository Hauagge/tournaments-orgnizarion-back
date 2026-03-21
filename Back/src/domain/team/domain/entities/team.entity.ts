export type TeamProps = {
  id?: number;
  competitionId: number;
  name: string;
  createdAt: Date;
};

type UpdateTeamProps = Partial<Pick<TeamProps, 'name'>>;

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

  update(input: UpdateTeamProps): Team {
    return new Team({
      ...this.props,
      name:
        input.name === undefined
          ? this.props.name
          : Team.normalizeName(input.name),
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
