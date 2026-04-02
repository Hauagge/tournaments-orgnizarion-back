import { CompetitionMode } from '../value-objects/competition-mode.enum';

export type CompetitionProps = {
  id?: number;
  name: string;
  mode: CompetitionMode;
  fightDurationSeconds: number;
  weighInMarginGrams: number;
  ageSplitYears: number;
  createdAt: Date;
};

export class Competition {
  private constructor(private readonly props: CompetitionProps) {}

  static create(
    props: Omit<CompetitionProps, 'id' | 'createdAt'>,
  ): Competition {
    return new Competition({
      ...props,
      createdAt: new Date(),
    });
  }

  static restore(props: CompetitionProps): Competition {
    return new Competition(props);
  }

  updateSettings(
    input: Partial<
      Pick<
        CompetitionProps,
        | 'name'
        | 'mode'
        | 'fightDurationSeconds'
        | 'weighInMarginGrams'
        | 'ageSplitYears'
      >
    >,
  ): Competition {
    return new Competition({
      ...this.props,
      name: input.name ?? this.props.name,
      mode: input.mode ?? this.props.mode,
      fightDurationSeconds:
        input.fightDurationSeconds ?? this.props.fightDurationSeconds,
      weighInMarginGrams:
        input.weighInMarginGrams ?? this.props.weighInMarginGrams,
      ageSplitYears: input.ageSplitYears ?? this.props.ageSplitYears,
    });
  }

  toJSON(): CompetitionProps {
    return {
      id: this.id,
      name: this.name,
      mode: this.mode,
      fightDurationSeconds: this.fightDurationSeconds,
      weighInMarginGrams: this.weighInMarginGrams,
      ageSplitYears: this.ageSplitYears,
      createdAt: this.createdAt,
    };
  }

  get id(): number | undefined {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get mode(): CompetitionMode {
    return this.props.mode;
  }

  get fightDurationSeconds(): number {
    return this.props.fightDurationSeconds;
  }

  get weighInMarginGrams(): number {
    return this.props.weighInMarginGrams;
  }

  get ageSplitYears(): number {
    return this.props.ageSplitYears;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
