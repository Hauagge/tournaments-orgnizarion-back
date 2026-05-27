import { ValidationError } from '@/shared/errors/validation.error';
import { FightStatus } from '../value-objects/fight-status.enum';

export type FightProps = {
  id?: number;
  competitionId: number;
  categoryId: number | null;
  keyGroupId: number | null;
  round?: number;
  order?: number;
  areaId: number | null;
  areaName: string | null;
  status: FightStatus;
  athleteAId: number | null;
  athleteBId: number | null;
  winnerId?: number | null;
  loserId?: number | null;
  nextFightId?: number | null;
  nextFightSlot?: 'A' | 'B' | null;
  createdManually?: boolean;
  isWo?: boolean;
  winType: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  orderIndex?: number;
  winnerAthleteId?: number | null;
  roundNumber?: number;
};

export class FightEntity {
  private constructor(private readonly props: FightProps) {}

  static create(
    props: Omit<
      FightProps,
      | 'id'
      | 'status'
      | 'winnerId'
      | 'loserId'
      | 'nextFightId'
      | 'nextFightSlot'
      | 'createdManually'
      | 'isWo'
      | 'winType'
      | 'startedAt'
      | 'finishedAt'
      | 'createdAt'
      | 'updatedAt'
      | 'winnerAthleteId'
      | 'orderIndex'
      | 'roundNumber'
    > & {
      orderIndex?: number;
      round?: number;
    },
  ): FightEntity {
    const now = new Date();
    return new FightEntity({
      ...props,
      round: props.round ?? 1,
      order: props.order ?? props.orderIndex ?? 1,
      status: FightStatus.PENDING,
      winnerId: null,
      loserId: null,
      nextFightId: null,
      nextFightSlot: null,
      createdManually: false,
      isWo: false,
      winType: null,
      startedAt: null,
      finishedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: FightProps): FightEntity {
    return new FightEntity({
      ...props,
      round: props.round ?? props.roundNumber ?? 1,
      order: props.orderIndex ?? props.order ?? 1,
      winnerId: props.winnerId ?? props.winnerAthleteId ?? null,
      loserId: props.loserId ?? null,
      nextFightId: props.nextFightId ?? null,
      nextFightSlot: props.nextFightSlot ?? null,
      createdManually: props.createdManually ?? false,
      isWo: props.isWo ?? false,
    });
  }

  assignArea(areaId: number | null): FightEntity {
    return new FightEntity({
      ...this.props,
      areaId,
    });
  }

  call(): FightEntity {
    if (this.props.status !== FightStatus.PENDING) {
      throw new ValidationError('Only pending fights can be called');
    }

    if (this.props.areaId === null) {
      throw new ValidationError(
        'Fight must be assigned to an area before calling',
      );
    }

    return new FightEntity({
      ...this.props,
      status: FightStatus.CALLED,
    });
  }

  start(startedAt: Date): FightEntity {
    if (this.props.status === FightStatus.CANCELED) {
      throw new ValidationError('Canceled fights cannot be started');
    }

    if (this.props.athleteAId === null || this.props.athleteBId === null) {
      throw new ValidationError('Fight requires two athletes before starting');
    }

    return new FightEntity({
      ...this.props,
      status: FightStatus.IN_PROGRESS,
      startedAt,
      updatedAt: startedAt,
    });
  }

  finish(input: {
    winnerId: number | null;
    loserId: number | null;
    winType: string;
    finishedAt: Date;
    isWo?: boolean;
  }): FightEntity {
    return new FightEntity({
      ...this.props,
      status: FightStatus.FINISHED,
      winnerId: input.winnerId,
      loserId: input.loserId,
      isWo: input.isWo ?? this.props.isWo,
      winType: input.winType,
      finishedAt: input.finishedAt,
      updatedAt: input.finishedAt,
    });
  }

  updateDetails(input: {
    categoryId?: number | null;
    round?: number;
    order?: number;
    areaId?: number | null;
    areaName?: string | null;
    athleteAId?: number | null;
    athleteBId?: number | null;
    status?: FightStatus;
    nextFightId?: number | null;
    nextFightSlot?: 'A' | 'B' | null;
    createdManually?: boolean;
    isWo?: boolean;
    winType?: string | null;
    winnerId?: number | null;
    loserId?: number | null;
    startedAt?: Date | null;
    finishedAt?: Date | null;
    updatedAt?: Date;
  }): FightEntity {
    return new FightEntity({
      ...this.props,
      categoryId: input.categoryId ?? this.props.categoryId,
      round: input.round ?? this.props.round,
      order: input.order ?? this.props.order,
      areaId: input.areaId !== undefined ? input.areaId : this.props.areaId,
      areaName:
        input.areaName !== undefined ? input.areaName : this.props.areaName,
      athleteAId:
        input.athleteAId !== undefined
          ? input.athleteAId
          : this.props.athleteAId,
      athleteBId:
        input.athleteBId !== undefined
          ? input.athleteBId
          : this.props.athleteBId,
      status: input.status ?? this.props.status,
      nextFightId:
        input.nextFightId !== undefined
          ? input.nextFightId
          : this.props.nextFightId,
      nextFightSlot:
        input.nextFightSlot !== undefined
          ? input.nextFightSlot
          : this.props.nextFightSlot,
      createdManually:
        input.createdManually ?? this.props.createdManually,
      isWo: input.isWo ?? this.props.isWo,
      winType: input.winType !== undefined ? input.winType : this.props.winType,
      winnerId:
        input.winnerId !== undefined ? input.winnerId : this.props.winnerId,
      loserId:
        input.loserId !== undefined ? input.loserId : this.props.loserId,
      startedAt:
        input.startedAt !== undefined ? input.startedAt : this.props.startedAt,
      finishedAt:
        input.finishedAt !== undefined
          ? input.finishedAt
          : this.props.finishedAt,
      updatedAt: input.updatedAt ?? new Date(),
    });
  }

  toJSON(): FightProps {
    return { ...this.props };
  }

  get id(): number | undefined {
    return this.props.id;
  }
  get competitionId(): number {
    return this.props.competitionId;
  }
  get categoryId(): number | null {
    return this.props.categoryId;
  }
  get keyGroupId(): number | null {
    return this.props.keyGroupId;
  }
  get round(): number {
    return this.props.round ?? 1;
  }
  get order(): number {
    return this.props.order ?? 1;
  }
  get areaId(): number | null {
    return this.props.areaId;
  }
  get status(): FightStatus {
    return this.props.status;
  }
  get athleteAId(): number | null {
    return this.props.athleteAId;
  }
  get athleteBId(): number | null {
    return this.props.athleteBId;
  }
  get winnerId(): number | null {
    return this.props.winnerId ?? null;
  }
  get winnerAthleteId(): number | null {
    return this.props.winnerId ?? null;
  }
  get loserId(): number | null {
    return this.props.loserId ?? null;
  }
  get nextFightId(): number | null {
    return this.props.nextFightId ?? null;
  }
  get nextFightSlot(): 'A' | 'B' | null {
    return this.props.nextFightSlot ?? null;
  }
  get createdManually(): boolean {
    return this.props.createdManually ?? false;
  }
  get isWo(): boolean {
    return this.props.isWo ?? false;
  }
  get winType(): string | null {
    return this.props.winType;
  }
  get startedAt(): Date | null {
    return this.props.startedAt;
  }
  get finishedAt(): Date | null {
    return this.props.finishedAt;
  }
  get orderIndex(): number {
    return this.props.order ?? 1;
  }

  get roundNumber(): number {
    return this.props.round ?? 1;
  }

  get areaName(): string | null {
    return this.props.areaName;
  }

  get createdAt(): Date {
    return this.props.createdAt ?? new Date(0);
  }

  get updatedAt(): Date {
    return this.props.updatedAt ?? new Date(0);
  }
}
