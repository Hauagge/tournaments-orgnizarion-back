export type CategoryProps = {
  id?: number;
  competitionId: number;
  name: string;
  belt: string;
  ageMin: number | null;
  ageMax: number | null;
  weightMinGrams: number | null;
  weightMaxGrams: number | null;
  totalAthletes: number;
  createdAt: Date;
};

export class Category {
  private constructor(private readonly props: CategoryProps) {}

  static create(
    props: Omit<CategoryProps, 'id' | 'createdAt'>,
  ): Category {
    return new Category({
      ...props,
      name: Category.normalizeName(props.name),
      belt: props.belt.trim(),
      createdAt: new Date(),
    });
  }

  static restore(props: CategoryProps): Category {
    return new Category({
      ...props,
      name: Category.normalizeName(props.name),
      belt: props.belt.trim(),
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
      ageMin: this.ageMin,
      ageMax: this.ageMax,
      weightMinGrams: this.weightMinGrams,
      weightMaxGrams: this.weightMaxGrams,
      totalAthletes: this.totalAthletes,
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

  get belt(): string {
    return this.props.belt;
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
}
