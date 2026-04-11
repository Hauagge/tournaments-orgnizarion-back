import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AcademyTypeOrmEntity } from '@/domain/academy/infra/persistence/entities/academy.typeorm-entity';
import { WeighInTypeOrmEntity } from '@/domain/weighin/infra/persistence/entities/weigh-in.typeorm-entity';

@Entity('athletes')
export class AthleteTypeOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'competition_id', type: 'int' })
  competitionId: number;

  @Column({ name: 'full_name', type: 'varchar' })
  fullName: string;

  @Column({ name: 'document_number', type: 'varchar', nullable: true })
  documentNumber: string | null;

  @Column({ name: 'birth_date', type: 'date' })
  birthDate: Date;

  @Column({ type: 'varchar' })
  belt: string;

  @Column({ name: 'declared_weight_grams', type: 'int' })
  declaredWeight: number;

  @Column({ name: 'academy_id', type: 'int', nullable: true })
  academyId: number | null;

  @ManyToOne(() => AcademyTypeOrmEntity, (academy) => academy.athletes, {
    nullable: true,
  })
  @JoinColumn({ name: 'academy_id' })
  academy?: AcademyTypeOrmEntity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @OneToOne(() => WeighInTypeOrmEntity, (weighIn) => weighIn.athlete)
  weighIn?: WeighInTypeOrmEntity;
}
