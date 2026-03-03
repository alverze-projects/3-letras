import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameGateway } from './game.gateway';
import { GamesModule } from '../games/games.module';
import { WordsModule } from '../words/words.module';
import { AuthModule } from '../auth/auth.module';
import { RecordsModule } from '../records/records.module';
import { Game } from '../entities/game.entity';
import { GamePlayer } from '../entities/game-player.entity';
import { Round } from '../entities/round.entity';
import { Turn } from '../entities/turn.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Game, GamePlayer, Round, Turn, User]),
    GamesModule,
    WordsModule,
    AuthModule,
    RecordsModule,
  ],
  providers: [GameGateway],
})
export class GatewayModule {}
