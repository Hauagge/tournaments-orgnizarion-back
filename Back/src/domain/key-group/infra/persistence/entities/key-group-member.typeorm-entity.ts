import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('key_group_members')
export class KeyGroupMemberTypeOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'key_group_id', type: 'int' })
  keyGroupId: number;

  @Column({ name: 'athlete_id', type: 'int' })
  athleteId: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
