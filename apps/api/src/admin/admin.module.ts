import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Game } from '../entities/game.entity';
import { AdminSeedService } from './admin-seed.service';
import { GameCleanupService } from './game-cleanup.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Game])],
  providers: [AdminSeedService, GameCleanupService],
})
export class AdminModule {}
