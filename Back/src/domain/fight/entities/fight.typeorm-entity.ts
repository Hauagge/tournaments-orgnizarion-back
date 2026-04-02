import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { FightStatus } from '../domain/value-objects/fight-status.enum';

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

  @Column({ name: 'area_id', type: 'int', nullable: true })
  areaId: number | null;

  @Column({ type: 'varchar' })
  status: FightStatus;

  @Column({ name: 'athlete_a_id', type: 'int' })
  athleteAId: number;

  @Column({ name: 'athlete_b_id', type: 'int' })
  athleteBId: number;

  @Column({ name: 'winner_athlete_id', type: 'int', nullable: true })
  winnerAthleteId: number | null;

  @Column({ name: 'win_type', type: 'varchar', nullable: true })
  winType: string | null;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'finished_at', type: 'timestamp', nullable: true })
  finishedAt: Date | null;

  @Column({ name: 'order_index', type: 'int' })
  orderIndex: number;
}
