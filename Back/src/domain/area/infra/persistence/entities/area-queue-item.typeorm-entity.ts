import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AreaQueueItemStatus } from '../../../domain/value-objects/area-queue-item-status.enum';

@Entity('area_queue_items')
export class AreaQueueItemTypeOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'area_id', type: 'int' })
  areaId: number;

  @Column({ name: 'fight_id', type: 'int' })
  fightId: number;

  @Column({ type: 'int' })
  position: number;

  @Column({ type: 'varchar' })
  status: AreaQueueItemStatus;
}
