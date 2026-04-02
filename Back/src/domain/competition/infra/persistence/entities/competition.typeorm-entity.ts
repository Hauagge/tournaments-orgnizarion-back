import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CompetitionMode } from '../../../domain/value-objects/competition-mode.enum';

@Entity('competitions')
export class CompetitionTypeOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  mode: CompetitionMode;

  @Column({ name: 'fight_duration_seconds', type: 'int' })
  fightDurationSeconds: number;

  @Column({ name: 'weigh_in_margin_grams', type: 'int' })
  weighInMarginGrams: number;

  @Column({ name: 'age_split_years', type: 'int' })
  ageSplitYears: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
