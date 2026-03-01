import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany,
} from 'typeorm';
import { GamePlayer } from './game-player.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  nickname: string;

  @Column({ type: 'text', nullable: true, unique: true })
  email: string | null;

  @Column({ type: 'text', nullable: true })
  passwordHash: string | null;

  @Column({ type: 'boolean', default: true })
  isGuest: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => GamePlayer, (gp) => gp.user)
  gamePlayers: GamePlayer[];
}
