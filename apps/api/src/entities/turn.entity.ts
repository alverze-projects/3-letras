import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Round } from './round.entity';

@Entity('turns')
export class Turn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  roundId: string;

  @Column({ type: 'text' })
  playerId: string;

  @Column({ type: 'integer' })
  turnNumber: number;

  @Column({ type: 'text', nullable: true })
  word: string | null;

  @Column({ type: 'integer', default: 0 })
  score: number;

  @Column({ type: 'boolean', default: false })
  isValid: boolean;

  @Column({ type: 'text', default: 'pending' })
  status: string;

  @Column({ type: 'text', nullable: true })
  invalidReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  submittedAt: Date | null;

  @ManyToOne(() => Round, (r) => r.turns)
  @JoinColumn({ name: 'roundId' })
  round: Round;
}
