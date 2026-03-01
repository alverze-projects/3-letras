import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  OneToMany, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { GamePlayer } from './game-player.entity';
import { Round } from './round.entity';

@Entity('games')
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true, length: 6 })
  code: string;

  @Column({ type: 'text', default: 'waiting' })
  status: string;

  @Column({ type: 'text', default: 'medium' })
  difficulty: string;

  @Column({ type: 'integer', default: 5 })
  totalRounds: number;

  @Column({ type: 'text' })
  hostId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'hostId' })
  host: User;

  @OneToMany(() => GamePlayer, (gp) => gp.game, { cascade: true })
  gamePlayers: GamePlayer[];

  @OneToMany(() => Round, (r) => r.game, { cascade: true })
  rounds: Round[];

  @CreateDateColumn()
  createdAt: Date;
}
