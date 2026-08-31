import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FightStatus } from '../domain/value-objects/fight-status.enum';
import { AreaTypeOrmEntity } from '@/domain/area/infra/persistence/entities/area.typeorm-entity';

@Entity('fights')
export class FightTypeOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'competition_id', type: 'int' })
  competitionId: number;

  @Column({ name: 'category_id', type: 'int', nullable: true })
  categoryId: number | null;

  @Column({ name: 'key_group_id', type: 'int', nullable: true })
  keyGroupId: number | null;

  @Column({ name: 'round_number', type: 'int', default: 1 })
  round: number;

  @Column({ name: 'order_index', type: 'int' })
  order: number;

  @Column({ name: 'area_id', type: 'int', nullable: true })
  areaId: number | null;

  @Column({ type: 'varchar' })
  status: FightStatus;

  @Column({ name: 'athlete_a_id', type: 'int', nullable: true })
  athleteAId: number | null;

  @Column({ name: 'athlete_b_id', type: 'int', nullable: true })
  athleteBId: number | null;

  @Column({ name: 'winner_athlete_id', type: 'int', nullable: true })
  winnerId: number | null;

  @Column({ name: 'loser_athlete_id', type: 'int', nullable: true })
  loserId: number | null;

  @Column({ name: 'next_fight_id', type: 'int', nullable: true })
  nextFightId: number | null;

  @Column({ name: 'next_fight_slot', type: 'varchar', length: 1, nullable: true })
  nextFightSlot: 'A' | 'B' | null;

  @Column({ name: 'loser_next_fight_id', type: 'int', nullable: true })
  loserNextFightId: number | null;

  @Column({
    name: 'loser_next_fight_slot',
    type: 'varchar',
    length: 1,
    nullable: true,
  })
  loserNextFightSlot: 'A' | 'B' | null;

  @Column({ name: 'created_manually', type: 'boolean', default: false })
  createdManually: boolean;

  @Column({ name: 'is_wo', type: 'boolean', default: false })
  isWo: boolean;

  @Column({ name: 'win_type', type: 'varchar', nullable: true })
  winType: string | null;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'finished_at', type: 'timestamp', nullable: true })
  finishedAt: Date | null;

  @ManyToOne(() => AreaTypeOrmEntity, (area) => area.fights)
  @JoinColumn({ name: 'area_id' })
  area: AreaTypeOrmEntity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
