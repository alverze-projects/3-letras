import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { GamePlayer } from '../entities/game-player.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, GamePlayer])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
