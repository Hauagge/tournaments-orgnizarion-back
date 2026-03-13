import { Athlete } from 'src/domain/athlete/entities/athlete.entity';
import { Category } from 'src/domain/category/entities/categoory.entitty';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('belt')
export class Belt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'color' })
  color: string;

  @ManyToOne(() => Category, (category) => category.belts)
  categories: Category[];

  @ManyToOne(() => Athlete, (athlete) => athlete.belt)
  athletes: Athlete[];
}
