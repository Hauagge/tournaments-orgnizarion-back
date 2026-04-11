import { FightTypeOrmEntity } from '@/domain/fight/entities/fight.typeorm-entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('areas')
export class AreaTypeOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'competition_id', type: 'int' })
  competitionId: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'int' })
  order: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @OneToMany(() => FightTypeOrmEntity, (fight) => fight.area)
  fights: FightTypeOrmEntity[];
}
