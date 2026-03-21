import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AthleteTypeOrmEntity } from '@/domain/athlete/infra/persistence/entities/athlete.typeorm-entity';

@Entity('teams')
export class TeamTypeOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'competition_id', type: 'int' })
  competitionId: number;

  @Column({ type: 'varchar' })
  name: string;

  @OneToMany(() => AthleteTypeOrmEntity, (athlete) => athlete.team)
  athletes?: AthleteTypeOrmEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
