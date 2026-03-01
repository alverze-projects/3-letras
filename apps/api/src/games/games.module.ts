import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { Game } from '../entities/game.entity';
import { GamePlayer } from '../entities/game-player.entity';
import { Round } from '../entities/round.entity';
import { Turn } from '../entities/turn.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Game, GamePlayer, Round, Turn, User])],
  providers: [GamesService],
  controllers: [GamesController],
  exports: [GamesService],
})
export class GamesModule {}
