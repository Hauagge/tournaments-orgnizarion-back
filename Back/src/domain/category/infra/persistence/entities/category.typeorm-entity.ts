import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

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

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
