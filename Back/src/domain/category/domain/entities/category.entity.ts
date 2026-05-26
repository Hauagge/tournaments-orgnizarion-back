export type CategoryProps = {
  id?: number;
  competitionId: number;
  name: string;
  belt: string;
  allowMerge: boolean;
  mergeWithBelt: string | null;
  ageMin: number | null;
  ageMax: number | null;
  weightMinGrams: number | null;
  weightMaxGrams: number | null;
  totalAthletes: number;
  createdAt: Date;
  updatedAt: Date;
  championAthleteId: number | null;
};

export class Category {
  private constructor(private readonly props: CategoryProps) {}

  static create(
    props: Omit<
      CategoryProps,
      'id' | 'createdAt' | 'updatedAt' | 'championAthleteId'
    >,
  ): Category {
    return new Category({
      ...props,
      name: Category.normalizeName(props.name),
      belt: props.belt.trim(),
      mergeWithBelt: props.mergeWithBelt?.trim() || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      championAthleteId: null,
    });
  }

  static restore(props: CategoryProps): Category {
    return new Category({
      ...props,
      name: Category.normalizeName(props.name),
      belt: props.belt.trim(),
      mergeWithBelt: props.mergeWithBelt?.trim() || null,
    });
  }

  static normalizeName(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  toJSON(): CategoryProps {
    return {
      id: this.id,
      competitionId: this.competitionId,
      name: this.name,
      belt: this.belt,
      allowMerge: this.allowMerge,
      mergeWithBelt: this.mergeWithBelt,
      ageMin: this.ageMin,
      ageMax: this.ageMax,
      weightMinGrams: this.weightMinGrams,
      weightMaxGrams: this.weightMaxGrams,
      totalAthletes: this.totalAthletes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      championAthleteId: this.championAthleteId,
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

  get belt(): string {
    return this.props.belt;
  }

  get allowMerge(): boolean {
    return this.props.allowMerge;
  }

  get mergeWithBelt(): string | null {
    return this.props.mergeWithBelt;
  }

  get ageMin(): number | null {
    return this.props.ageMin;
  }

  get ageMax(): number | null {
    return this.props.ageMax;
  }

  get weightMinGrams(): number | null {
    return this.props.weightMinGrams;
  }

  get weightMaxGrams(): number | null {
    return this.props.weightMaxGrams;
  }

  get totalAthletes(): number {
    return this.props.totalAthletes;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get championAthleteId(): number | null {
    return this.props.championAthleteId;
  }

  setChampion(athleteId: number | null): Category {
    return new Category({
      ...this.props,
      championAthleteId: athleteId,
      updatedAt: new Date(),
    });
  }

  allowsBelt(belt: string): boolean {
    const normalizedBelt = belt.trim();

    if (this.belt === normalizedBelt) {
      return true;
    }

    return this.allowMerge && this.mergeWithBelt === normalizedBelt;
  }
}
