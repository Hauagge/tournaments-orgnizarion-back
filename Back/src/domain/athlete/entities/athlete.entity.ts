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

  @Column({ name: 'category_id' })
  categoryId: number;

  @Column({ default: false })
  weighInConfirmed: boolean;

  @Column({ nullable: true })
  eligible: boolean;

  @Column({ nullable: true })
  fightBracketId: number;

  @Column()
  tutor: string;

  @Column()
  subscriptionNumber: string;
}
