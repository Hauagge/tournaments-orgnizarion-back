import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TeamTypeOrmEntity } from '@/domain/team/infra/persistence/entities/team.typeorm-entity';

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

  @ManyToOne(() => TeamTypeOrmEntity, (team) => team.athletes, {
    nullable: true,
  })
  @JoinColumn({ name: 'team_id' })
  team?: TeamTypeOrmEntity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
