import { WeighInStatus } from '../value-objects/weigh-in-status.enum';

export type WeighInProps = {
  id?: number;
  competitionId: number;
  athleteId: number;
  measuredWeightGrams: number | null;
  status: WeighInStatus;
  performedAt: Date | null;
  performedById: number | null;
  performedBy: string | null;
  observation: string | null;
};

type ConfirmWeighInInput = {
  measuredWeightGrams: number;
  status: WeighInStatus.APPROVED | WeighInStatus.REJECTED;
  performedAt?: Date;
  performedById?: number | null;
  performedBy: string;
  observation?: string | null;
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
      performedById: null,
      performedBy: null,
      observation: null,
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
      performedById: input.performedById ?? null,
      performedBy: input.performedBy.trim(),
      observation: input.observation?.trim() || null,
    });
  }

  reset(): WeighIn {
    return new WeighIn({
      ...this.props,
      measuredWeightGrams: null,
      status: WeighInStatus.PENDING,
      performedAt: null,
      performedById: null,
      performedBy: null,
      observation: null,
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
      performedById: this.performedById,
      performedBy: this.performedBy,
      observation: this.observation,
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

  get performedById(): number | null {
    return this.props.performedById;
  }

  get performedBy(): string | null {
    return this.props.performedBy;
  }

  get observation(): string | null {
    return this.props.observation;
  }
}
