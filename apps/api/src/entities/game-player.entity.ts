import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { Game } from './game.entity';
import { User } from './user.entity';

@Entity('game_players')
export class GamePlayer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  gameId: string;

  @Column({ type: 'text' })
  userId: string;

  @Column({ type: 'integer', default: 0 })
  totalScore: number;

  @ManyToOne(() => Game, (g) => g.gamePlayers)
  @JoinColumn({ name: 'gameId' })
  game: Game;

  @ManyToOne(() => User, (u) => u.gamePlayers)
  @JoinColumn({ name: 'userId' })
  user: User;
}
