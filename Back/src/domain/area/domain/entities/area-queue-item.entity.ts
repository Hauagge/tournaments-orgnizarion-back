import { ValidationError } from '@/shared/errors/validation.error';
import { AreaQueueItemStatus } from '../value-objects/area-queue-item-status.enum';

export type AreaQueueItemProps = {
  id?: number;
  areaId: number;
  fightId: number;
  position: number;
  status: AreaQueueItemStatus;
};

export class AreaQueueItem {
  private constructor(private readonly props: AreaQueueItemProps) {}

  static create(
    props: Omit<AreaQueueItemProps, 'id' | 'status'>,
  ): AreaQueueItem {
    return new AreaQueueItem({
      ...props,
      status: AreaQueueItemStatus.QUEUED,
    });
  }

  static restore(props: AreaQueueItemProps): AreaQueueItem {
    return new AreaQueueItem(props);
  }

  call(): AreaQueueItem {
    if (this.props.status !== AreaQueueItemStatus.QUEUED) {
      throw new ValidationError('Only queued items can be called');
    }

    return new AreaQueueItem({
      ...this.props,
      status: AreaQueueItemStatus.CALLED,
    });
  }

  markDone(): AreaQueueItem {
    return new AreaQueueItem({
      ...this.props,
      status: AreaQueueItemStatus.DONE,
    });
  }

  toJSON(): AreaQueueItemProps {
    return { ...this.props };
  }

  get id(): number | undefined {
    return this.props.id;
  }

  get areaId(): number {
    return this.props.areaId;
  }

  get fightId(): number {
    return this.props.fightId;
  }

  get position(): number {
    return this.props.position;
  }

  get status(): AreaQueueItemStatus {
    return this.props.status;
  }
}
