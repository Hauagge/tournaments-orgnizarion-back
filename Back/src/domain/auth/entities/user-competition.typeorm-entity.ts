import { CompetitionTypeOrmEntity } from '@/domain/competition/infra/persistence/entities/competition.typeorm-entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';
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

  // `Relation<User>` (instead of a bare `User` type annotation) avoids a
  // direct, non-lazy runtime reference to `User` in the emitted decorator
  // metadata (`emitDecoratorMetadata`), which otherwise triggers a
  // "Cannot access 'User' before initialization" error depending on which of
  // these two mutually-referencing entity modules loads first (circular
  // import). This is TypeORM's documented pattern for breaking this class of
  // circular-relation issue while keeping full type-safety. The relation
  // itself is still resolved correctly via the lazy `() => User` thunk below,
  // which TypeORM only invokes after both modules have finished loading.
  @ManyToOne(() => User, (user) => user.competitionLinks, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user?: Relation<User>;

  @ManyToOne(() => CompetitionTypeOrmEntity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'competition_id' })
  competition?: CompetitionTypeOrmEntity;
}
