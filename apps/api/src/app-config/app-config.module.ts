import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigService } from './app-config.service';
import { AppConfigController } from './app-config.controller';
import { GameConfig } from '../entities/game-config.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([GameConfig])],
  controllers: [AppConfigController],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
