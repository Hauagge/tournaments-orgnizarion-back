import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TeamMemberTypeOrmEntity } from './team-member.typeorm-entity';
import { CompetitionTypeOrmEntity } from '@/domain/competition/infra/persistence/entities/competition.typeorm-entity';

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

  @ManyToOne(
    () => CompetitionTypeOrmEntity,
    (competition) => competition.teams,
    {
      nullable: false,
      onDelete: 'CASCADE',
    },
  )
  competition: CompetitionTypeOrmEntity;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
