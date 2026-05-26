import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('categories')
export class CategoryTypeOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'competition_id', type: 'int' })
  competitionId: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  belt: string;

  @Column({ name: 'allow_merge', type: 'boolean', default: false })
  allowMerge: boolean;

  @Column({ name: 'merge_with_belt', type: 'varchar', nullable: true })
  mergeWithBelt: string | null;

  @Column({ name: 'age_min', type: 'int', nullable: true })
  ageMin: number | null;

  @Column({ name: 'age_max', type: 'int', nullable: true })
  ageMax: number | null;

  @Column({ name: 'weight_min_grams', type: 'int', nullable: true })
  weightMinGrams: number | null;

  @Column({ name: 'weight_max_grams', type: 'int', nullable: true })
  weightMaxGrams: number | null;

  @Column({ name: 'total_athletes', type: 'int' })
  totalAthletes: number;

  @Column({ name: 'champion_athlete_id', type: 'int', nullable: true })
  championAthleteId: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
