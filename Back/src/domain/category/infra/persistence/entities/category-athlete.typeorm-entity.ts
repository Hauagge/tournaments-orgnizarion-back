import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('category_athletes')
export class CategoryAthleteTypeOrmEntity {
  @PrimaryColumn({ name: 'category_id', type: 'int' })
  categoryId: number;

  @PrimaryColumn({ name: 'athlete_id', type: 'int' })
  athleteId: number;
}
