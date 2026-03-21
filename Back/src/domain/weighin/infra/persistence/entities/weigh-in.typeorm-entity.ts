import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AthleteTypeOrmEntity } from '@/domain/athlete/infra/persistence/entities/athlete.typeorm-entity';
import { CompetitionTypeOrmEntity } from '@/domain/competition/infra/persistence/entities/competition.typeorm-entity';
import { WeighInStatus } from '../../../domain/value-objects/weigh-in-status.enum';

@Entity('weigh_ins')
@Index(['competitionId', 'athleteId'], { unique: true })
export class WeighInTypeOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'competition_id', type: 'int' })
  competitionId: number;

  @Column({ name: 'athlete_id', type: 'int' })
  athleteId: number;

  @ManyToOne(() => CompetitionTypeOrmEntity, { nullable: false })
  @JoinColumn({ name: 'competition_id' })
  competition?: CompetitionTypeOrmEntity;

  @ManyToOne(() => AthleteTypeOrmEntity, { nullable: false })
  @JoinColumn({ name: 'athlete_id' })
  athlete?: AthleteTypeOrmEntity;

  @Column({ name: 'measured_weight_grams', type: 'int', nullable: true })
  measuredWeightGrams: number | null;

  @Column({ type: 'varchar' })
  status: WeighInStatus;

  @Column({ name: 'performed_at', type: 'timestamp', nullable: true })
  performedAt: Date | null;

  @Column({ name: 'performed_by', type: 'varchar', nullable: true })
  performedBy: string | null;
}
