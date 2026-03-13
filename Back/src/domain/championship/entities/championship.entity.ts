import { Bracket } from 'src/domain/bracket/entities/bracket.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity('championship')
export class Championship {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'name' })
  name: string;

  @Column({ name: 'location' })
  location: string;

  @Column({ name: 'start_date' })
  startDate: Date;

  @Column({ name: 'end_date' })
  endDate: Date;

  @Column({ name: 'image_url' })
  imageUrl: string;

  @Column({ name: 'description' })
  description: string;

  @OneToMany(() => Bracket, (bracket) => bracket.championship)
  brackets: Bracket[];
}
