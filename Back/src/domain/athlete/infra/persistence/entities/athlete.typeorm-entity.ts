import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('athletes')
export class AthleteTypeOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'competition_id', type: 'int' })
  competitionId: number;

  @Column({ name: 'full_name', type: 'varchar' })
  fullName: string;

  @Column({ name: 'birth_date', type: 'date' })
  birthDate: Date;

  @Column({ type: 'varchar' })
  belt: string;

  @Column({ name: 'declared_weight_grams', type: 'int' })
  declaredWeightGrams: number;

  @Column({ name: 'team_id', type: 'int', nullable: true })
  teamId: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
