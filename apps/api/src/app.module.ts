import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { UsersModule } from './users/users.module';
import { GamesModule } from './games/games.module';
import { WordsModule } from './words/words.module';
import { DictionaryModule } from './dictionary/dictionary.module';
import { AdmobModule } from './admob/admob.module';
import { VocabModule } from './vocab/vocab.module';
import { GatewayModule } from './gateway/gateway.module';
import { User } from './entities/user.entity';
import { Game } from './entities/game.entity';
import { GamePlayer } from './entities/game-player.entity';
import { Round } from './entities/round.entity';
import { Turn } from './entities/turn.entity';
import { AdmobConfig } from './entities/admob-config.entity';
import { VocabEntry } from './entities/vocab-entry.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'better-sqlite3',
        database: config.get<string>('DATABASE_PATH', 'data/tresletras.db'),
        entities: [User, Game, GamePlayer, Round, Turn, AdmobConfig, VocabEntry],
        synchronize: true,
        logging: config.get('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    AdminModule,
    UsersModule,
    DictionaryModule,
    WordsModule,
    GamesModule,
    AdmobModule,
    VocabModule,
    GatewayModule,
  ],
})
export class AppModule {}
