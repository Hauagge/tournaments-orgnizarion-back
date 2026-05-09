import { CompetitionTypeOrmEntity } from '@/domain/competition/infra/persistence/entities/competition.typeorm-entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { CompetitionAccessRole } from '../competition-access-role.enum';
import { User } from './user.typeorm-entity';

@Entity('user_competitions')
export class UserCompetitionTypeOrmEntity {
  @PrimaryColumn({ name: 'user_id', type: 'int' })
  userId!: number;

  @PrimaryColumn({ name: 'competition_id', type: 'int' })
  competitionId!: number;

  @Column({ type: 'varchar' })
  role!: CompetitionAccessRole;

  @ManyToOne(() => User, (user) => user.competitionLinks, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => CompetitionTypeOrmEntity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'competition_id' })
  competition?: CompetitionTypeOrmEntity;
}
