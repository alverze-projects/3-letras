import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { GamesModule } from './games/games.module';
import { WordsModule } from './words/words.module';
import { DictionaryModule } from './dictionary/dictionary.module';
import { GatewayModule } from './gateway/gateway.module';
import { User } from './entities/user.entity';
import { Game } from './entities/game.entity';
import { GamePlayer } from './entities/game-player.entity';
import { Round } from './entities/round.entity';
import { Turn } from './entities/turn.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'better-sqlite3',
        database: config.get<string>('DATABASE_PATH', 'data/tresletras.db'),
        entities: [User, Game, GamePlayer, Round, Turn],
        synchronize: true,
        logging: config.get('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    DictionaryModule,
    WordsModule,
    GamesModule,
    GatewayModule,
  ],
})
export class AppModule {}
