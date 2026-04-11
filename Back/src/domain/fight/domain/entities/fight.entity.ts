import { ValidationError } from '@/shared/errors/validation.error';
import { FightStatus } from '../value-objects/fight-status.enum';

export type FightProps = {
  id?: number;
  competitionId: number;
  categoryId: number | null;
  keyGroupId: number | null;
  areaId: number | null;
  areaName: string | null;
  status: FightStatus;
  athleteAId: number;
  athleteBId: number;
  winnerAthleteId: number | null;
  winType: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  orderIndex: number;
};

export class FightEntity {
  private constructor(private readonly props: FightProps) {}

  static create(
    props: Omit<
      FightProps,
      | 'id'
      | 'status'
      | 'winnerAthleteId'
      | 'winType'
      | 'startedAt'
      | 'finishedAt'
    >,
  ): FightEntity {
    return new FightEntity({
      ...props,
      status: FightStatus.WAITING,
      winnerAthleteId: null,
      winType: null,
      startedAt: null,
      finishedAt: null,
    });
  }

  static restore(props: FightProps): FightEntity {
    return new FightEntity(props);
  }

  assignArea(areaId: number | null): FightEntity {
    return new FightEntity({
      ...this.props,
      areaId,
    });
  }

  call(): FightEntity {
    if (this.props.status !== FightStatus.WAITING) {
      throw new ValidationError('Only waiting fights can be called');
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
    return new FightEntity({
      ...this.props,
      status: FightStatus.IN_PROGRESS,
      startedAt,
    });
  }

  finish(input: {
    winnerAthleteId: number | null;
    winType: string;
    finishedAt: Date;
  }): FightEntity {
    return new FightEntity({
      ...this.props,
      status: FightStatus.FINISHED,
      winnerAthleteId: input.winnerAthleteId,
      winType: input.winType,
      finishedAt: input.finishedAt,
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
  get areaId(): number | null {
    return this.props.areaId;
  }
  get status(): FightStatus {
    return this.props.status;
  }
  get athleteAId(): number {
    return this.props.athleteAId;
  }
  get athleteBId(): number {
    return this.props.athleteBId;
  }
  get winnerAthleteId(): number | null {
    return this.props.winnerAthleteId;
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
    return this.props.orderIndex;
  }

  get areaName(): string | null {
    return this.props.areaName;
  }
}
