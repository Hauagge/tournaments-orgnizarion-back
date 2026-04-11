export type AthleteProps = {
  id?: number;
  competitionId: number;
  fullName: string;
  documentNumber: string | null;
  birthDate: Date;
  belt: string;
  declaredWeight: number;
  academyId: number | null;
  createdAt: Date;
};

type UpdatableAthleteProps = Partial<
  Pick<
    AthleteProps,
    | 'fullName'
    | 'documentNumber'
    | 'birthDate'
    | 'belt'
    | 'declaredWeight'
    | 'academyId'
  >
>;

export class Athlete {
  private constructor(private readonly props: AthleteProps) {}

  static create(props: Omit<AthleteProps, 'id' | 'createdAt'>): Athlete {
    return new Athlete({
      ...props,
      fullName: Athlete.normalizeFullName(props.fullName),
      documentNumber: Athlete.normalizeDocumentNumber(props.documentNumber),
      belt: props.belt.trim(),
      createdAt: new Date(),
    });
  }

  static restore(props: AthleteProps): Athlete {
    return new Athlete({
      ...props,
      fullName: Athlete.normalizeFullName(props.fullName),
      documentNumber: Athlete.normalizeDocumentNumber(props.documentNumber),
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
      documentNumber:
        input.documentNumber !== undefined
          ? Athlete.normalizeDocumentNumber(input.documentNumber)
          : this.props.documentNumber,
      birthDate: input.birthDate ?? this.props.birthDate,
      belt: input.belt !== undefined ? input.belt.trim() : this.props.belt,
      declaredWeight: input.declaredWeight ?? this.props.declaredWeight,
      academyId:
        input.academyId !== undefined ? input.academyId : this.props.academyId,
    });
  }

  static normalizeFullName(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  static normalizeDocumentNumber(value: string | null): string | null {
    return value?.trim().replace(/\s+/g, ' ') || null;
  }

  toJSON(): AthleteProps {
    return {
      id: this.id,
      competitionId: this.competitionId,
      fullName: this.fullName,
      documentNumber: this.documentNumber,
      birthDate: this.birthDate,
      belt: this.belt,
      declaredWeight: this.declaredWeight,
      academyId: this.academyId,
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

  get documentNumber(): string | null {
    return this.props.documentNumber;
  }

  get birthDate(): Date {
    return this.props.birthDate;
  }

  get belt(): string {
    return this.props.belt;
  }

  get declaredWeight(): number {
    return this.props.declaredWeight;
  }

  get academyId(): number | null {
    return this.props.academyId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
