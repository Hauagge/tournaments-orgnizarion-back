import { WeighInStatus } from '../value-objects/weigh-in-status.enum';

export type WeighInProps = {
  id?: number;
  competitionId: number;
  athleteId: number;
  measuredWeightGrams: number | null;
  status: WeighInStatus;
  performedAt: Date | null;
  performedBy: string | null;
};

type ConfirmWeighInInput = {
  measuredWeightGrams: number;
  status: WeighInStatus.APPROVED | WeighInStatus.REJECTED;
  performedAt?: Date;
  performedBy: string;
};

export class WeighIn {
  private constructor(private readonly props: WeighInProps) {}

  static createPending(input: {
    competitionId: number;
    athleteId: number;
  }): WeighIn {
    return new WeighIn({
      competitionId: input.competitionId,
      athleteId: input.athleteId,
      measuredWeightGrams: null,
      status: WeighInStatus.PENDING,
      performedAt: null,
      performedBy: null,
    });
  }

  static restore(props: WeighInProps): WeighIn {
    return new WeighIn(props);
  }

  confirm(input: ConfirmWeighInInput): WeighIn {
    return new WeighIn({
      ...this.props,
      measuredWeightGrams: input.measuredWeightGrams,
      status: input.status,
      performedAt: input.performedAt ?? new Date(),
      performedBy: input.performedBy.trim(),
    });
  }

  reset(): WeighIn {
    return new WeighIn({
      ...this.props,
      measuredWeightGrams: null,
      status: WeighInStatus.PENDING,
      performedAt: null,
      performedBy: null,
    });
  }

  toJSON(): WeighInProps {
    return {
      id: this.id,
      competitionId: this.competitionId,
      athleteId: this.athleteId,
      measuredWeightGrams: this.measuredWeightGrams,
      status: this.status,
      performedAt: this.performedAt,
      performedBy: this.performedBy,
    };
  }

  get id(): number | undefined {
    return this.props.id;
  }

  get competitionId(): number {
    return this.props.competitionId;
  }

  get athleteId(): number {
    return this.props.athleteId;
  }

  get measuredWeightGrams(): number | null {
    return this.props.measuredWeightGrams;
  }

  get status(): WeighInStatus {
    return this.props.status;
  }

  get performedAt(): Date | null {
    return this.props.performedAt;
  }

  get performedBy(): string | null {
    return this.props.performedBy;
  }
}
