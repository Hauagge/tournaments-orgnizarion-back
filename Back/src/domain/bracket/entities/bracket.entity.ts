import { Athlete } from 'src/domain/athlete/entities/athlete.entity';
import { Belt } from 'src/domain/belt/entities/belt.entity';
import { Category } from 'src/domain/category/entities/categoory.entitty';
import { Championship } from 'src/domain/championship/entities/championship.entity';
import { Fight } from 'src/domain/fight/entities/fight.entinty';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('bracket')
export class Bracket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  spot: number;

  @OneToMany(() => Athlete, (athlete) => athlete.bracket)
  athletes: Athlete[];

  @OneToMany(() => Fight, (fight) => fight.bracket, { cascade: true })
  fights: Fight[];

  @Column({ name: 'category_id' })
  categoryId: number;

  @ManyToOne(() => Category, (category) => category.brackets)
  @JoinColumn({ name: 'category_id', referencedColumnName: 'id' })
  category: Category;

  @Column({ name: 'championship_id' })
  championshipId: number;

  @ManyToOne(() => Championship, (championship) => championship.brackets)
  @JoinColumn({ name: 'championship_id', referencedColumnName: 'id' })
  championship: Championship;
}
