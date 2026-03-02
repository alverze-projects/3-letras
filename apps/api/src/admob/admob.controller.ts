import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { AdmobService, AdmobConfigDto } from './admob.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

@Controller('admob')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdmobController {
  constructor(private readonly admobService: AdmobService) {}

  @Get()
  get() {
    return this.admobService.get();
  }

  @Put()
  update(@Body() dto: Partial<AdmobConfigDto>) {
    return this.admobService.update(dto);
  }
}
