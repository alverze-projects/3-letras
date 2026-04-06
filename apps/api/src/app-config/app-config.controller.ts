import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { AppConfigService } from './app-config.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

@Controller('config')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AppConfigController {
  constructor(private readonly configService: AppConfigService) {}

  @Get()
  async getConfig() {
    return this.configService.getConfig();
  }

  @Patch()
  async updateConfig(@Body() body: { turnDurationSeconds?: number; soloRoundDurationSeconds?: number }) {
    return this.configService.updateConfig(body);
  }
}
