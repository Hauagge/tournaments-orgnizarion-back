import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TeamTypeOrmEntity } from './team.typeorm-entity';

@Entity('team_members')
export class TeamMemberTypeOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'team_id', type: 'int' })
  teamId: number;

  @Column({ name: 'athlete_id', type: 'int' })
  athleteId: number;

  @ManyToOne(() => TeamTypeOrmEntity, (team) => team.members, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'team_id' })
  team: TeamTypeOrmEntity;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
