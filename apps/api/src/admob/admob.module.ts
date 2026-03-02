import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdmobConfig } from '../entities/admob-config.entity';
import { AdmobController } from './admob.controller';
import { AdmobService } from './admob.service';

@Module({
  imports: [TypeOrmModule.forFeature([AdmobConfig])],
  controllers: [AdmobController],
  providers: [AdmobService],
})
export class AdmobModule {}
