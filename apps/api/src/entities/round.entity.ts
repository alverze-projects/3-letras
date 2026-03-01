import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, OneToMany,
} from 'typeorm';
import { Game } from './game.entity';
import { Turn } from './turn.entity';

@Entity('rounds')
export class Round {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  gameId: string;

  @Column({ type: 'integer' })
  roundNumber: number;

  @Column({ type: 'simple-array' })
  letters: string[];

  @Column({ type: 'integer' })
  dieResult: number;

  @Column({ type: 'boolean', default: false })
  isComplete: boolean;

  @ManyToOne(() => Game, (g) => g.rounds)
  @JoinColumn({ name: 'gameId' })
  game: Game;

  @OneToMany(() => Turn, (t) => t.round, { cascade: true })
  turns: Turn[];
}
