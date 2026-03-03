import {
  Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn,
} from 'typeorm';

@Entity('records')
export class Record {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Identificador único del tipo de récord. Solo existe una fila por tipo. */
  @Column({ type: 'text', unique: true })
  type: string;

  @Column({ type: 'text' })
  holderId: string;

  /** Guardamos el nickname para no necesitar un JOIN en cada consulta */
  @Column({ type: 'text' })
  holderNickname: string;

  /** El valor que define el récord (palabras, puntos, etc.) */
  @Column({ type: 'integer' })
  value: number;

  @Column({ type: 'text' })
  gameId: string;

  @Column({ type: 'text' })
  roundId: string;

  /** Letras base de la ronda donde se logró el récord */
  @Column({ type: 'simple-json' })
  letters: string[];

  @UpdateDateColumn()
  achievedAt: Date;
}
