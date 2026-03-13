import { Bracket } from 'src/domain/bracket/entities/bracket.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('Fight')
export class Fight {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'athlete1_id' })
  athlete1Id: number;

  @Column({ name: 'athlete2_id' })
  athlete2Id: number;

  @Column({ name: 'bracket_id' })
  bracketId: number;

  @Column({ name: 'winner_id' })
  winnerId: number;

  @ManyToOne(() => Bracket, (bracket) => bracket.fights)
  @JoinColumn({ name: 'bracket_id', referencedColumnName: 'id' })
  bracket: Bracket;

  @Column({ name: 'athlete1_score' })
  athlete1Score: number;

  @Column({ name: 'athlete2_score' })
  athlete2Score: number;

  @Column({ name: 'athlete1_penalty' })
  athlete1Penalty: number;

  @Column({ name: 'athlete2_penalty' })
  athlete2Penalty: number;

  @Column({ name: 'is_submission' })
  isSubmission: boolean;
}
