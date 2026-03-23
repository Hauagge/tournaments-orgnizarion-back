import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TeamMemberTypeOrmEntity } from './team-member.typeorm-entity';

@Entity('teams')
export class TeamTypeOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'competition_id', type: 'int' })
  competitionId: number;

  @Column({ type: 'varchar' })
  name: string;

  @OneToMany(() => TeamMemberTypeOrmEntity, (member) => member.team)
  members?: TeamMemberTypeOrmEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
