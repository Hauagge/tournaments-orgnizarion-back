import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuthRole } from '../auth-role.enum';

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
}
