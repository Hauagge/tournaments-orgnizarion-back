import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuthRole } from '../auth-role.enum';
import { UserCompetitionTypeOrmEntity } from './user-competition.typeorm-entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'varchar' })
  role: AuthRole;

  @Column({ name: 'academy_id', type: 'int', nullable: true })
  academyId: number | null;

  @OneToMany(
    () => UserCompetitionTypeOrmEntity,
    (userCompetition) => userCompetition.user,
  )
  competitionLinks?: UserCompetitionTypeOrmEntity[];
}
