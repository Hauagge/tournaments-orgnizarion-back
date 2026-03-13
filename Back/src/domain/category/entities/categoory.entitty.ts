import { Athlete } from 'src/domain/athlete/entities/athlete.entity';
import { Belt } from 'src/domain/belt/entities/belt.entity';
import { Bracket } from 'src/domain/bracket/entities/bracket.entity';
import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('category')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'belt_id' })
  beltId: number;

  @OneToMany(() => Belt, (belt) => belt.categories)
  @JoinColumn({ name: 'belt_id', referencedColumnName: 'id' })
  belts: Belt[];

  @Column({ name: 'max_age', type: 'int' })
  maxWeight: number;

  @Column({ name: 'min_age', type: 'int' })
  minWeight: number;

  @Column({ name: 'max_age', type: 'int' })
  maxAge: number;

  @Column({ name: 'min_age', type: 'int' })
  minAge: number;

  @OneToMany(() => Bracket, (bracket) => bracket.category)
  brackets: Bracket[];

  @OneToMany(() => Athlete, (athlete) => athlete.category)
  athletes: Athlete[];
}
