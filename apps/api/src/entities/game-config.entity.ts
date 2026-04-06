import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('game_config')
export class GameConfig {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string; // Utilizaremos un ID fijo 'singleton' para esta tabla, ya que es configuración global.

  @Column({ type: 'int', default: 25 })
  turnDurationSeconds: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
