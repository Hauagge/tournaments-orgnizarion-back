export type AthleteProps = {
  id?: number;
  competitionId: number;
  fullName: string;
  birthDate: Date;
  belt: string;
  declaredWeightGrams: number;
  teamId: number | null;
  createdAt: Date;
};

type UpdatableAthleteProps = Partial<
  Pick<
    AthleteProps,
    'fullName' | 'birthDate' | 'belt' | 'declaredWeightGrams' | 'teamId'
  >
>;

export class Athlete {
  private constructor(private readonly props: AthleteProps) {}

  static create(
    props: Omit<AthleteProps, 'id' | 'createdAt'>,
  ): Athlete {
    return new Athlete({
      ...props,
      fullName: Athlete.normalizeFullName(props.fullName),
      belt: props.belt.trim(),
      createdAt: new Date(),
    });
  }

  static restore(props: AthleteProps): Athlete {
    return new Athlete({
      ...props,
      fullName: Athlete.normalizeFullName(props.fullName),
      belt: props.belt.trim(),
    });
  }

  update(input: UpdatableAthleteProps): Athlete {
    return new Athlete({
      ...this.props,
      fullName:
        input.fullName !== undefined
          ? Athlete.normalizeFullName(input.fullName)
          : this.props.fullName,
      birthDate: input.birthDate ?? this.props.birthDate,
      belt: input.belt !== undefined ? input.belt.trim() : this.props.belt,
      declaredWeightGrams:
        input.declaredWeightGrams ?? this.props.declaredWeightGrams,
      teamId: input.teamId !== undefined ? input.teamId : this.props.teamId,
    });
  }

  static normalizeFullName(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  toJSON(): AthleteProps {
    return {
      id: this.id,
      competitionId: this.competitionId,
      fullName: this.fullName,
      birthDate: this.birthDate,
      belt: this.belt,
      declaredWeightGrams: this.declaredWeightGrams,
      teamId: this.teamId,
      createdAt: this.createdAt,
    };
  }

  get id(): number | undefined {
    return this.props.id;
  }

  get competitionId(): number {
    return this.props.competitionId;
  }

  get fullName(): string {
    return this.props.fullName;
  }

  get birthDate(): Date {
    return this.props.birthDate;
  }

  get belt(): string {
    return this.props.belt;
  }

  get declaredWeightGrams(): number {
    return this.props.declaredWeightGrams;
  }

  get teamId(): number | null {
    return this.props.teamId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
