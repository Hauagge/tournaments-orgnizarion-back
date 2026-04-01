export type TeamMemberProps = {
  id?: number;
  teamId: number;
  athleteId: number;
  createdAt: Date;
};

export class TeamMember {
  private constructor(private readonly props: TeamMemberProps) {}

  static create(props: Omit<TeamMemberProps, 'id' | 'createdAt'>): TeamMember {
    return new TeamMember({
      ...props,
      createdAt: new Date(),
    });
  }

  static restore(props: TeamMemberProps): TeamMember {
    return new TeamMember(props);
  }

  toJSON(): TeamMemberProps {
    return {
      id: this.id,
      teamId: this.teamId,
      athleteId: this.athleteId,
      createdAt: this.createdAt,
    };
  }

  get id(): number | undefined {
    return this.props.id;
  }

  get teamId(): number {
    return this.props.teamId;
  }

  get athleteId(): number {
    return this.props.athleteId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
