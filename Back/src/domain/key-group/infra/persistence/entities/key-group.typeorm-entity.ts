import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { KeyGroupStatus } from '../../../domain/value-objects/key-group-status.enum';

@Entity('key_groups')
export class KeyGroupTypeOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'competition_id', type: 'int' })
  competitionId: number;

  @Column({ name: 'category_id', type: 'int', nullable: true })
  categoryId: number | null;

  @Column({ type: 'varchar', nullable: true })
  name: string | null;

  @Column({ type: 'varchar' })
  status: KeyGroupStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
