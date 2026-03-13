import { Belt } from 'src/domain/belt/entities/belt.entity';
import { Bracket } from 'src/domain/bracket/entities/bracket.entity';
import { Category } from 'src/domain/category/entities/categoory.entitty';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
} from 'typeorm';

@Entity()
export class Athlete {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  age: number;

  @Column('float')
  weight: number;

  @Column({ name: 'belt_id' })
  beltId: number;

  @ManyToOne(() => Belt, (belt) => belt.athletes)
  belt: Belt;

  @Column({ name: 'category_id' })
  categoryId: number;

  @Column({ default: false })
  weighInConfirmed: boolean;

  @Column({ nullable: true })
  eligible: boolean;

  @Column({ nullable: true })
  fightBracketId: number;

  @ManyToOne(() => Bracket, (bracket) => bracket.athletes)
  bracket: Bracket;

  @Column()
  tutor: string;

  @Column()
  subscriptionNumber: string;

  @ManyToOne(() => Category, (category) => category.athletes)
  category: Category;
}
