import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdmobConfig } from '../entities/admob-config.entity';

export interface AdmobConfigDto {
  enabled: boolean;
  testMode: boolean;
  androidAppId: string | null;
  bannerAndroid: string | null;
  interstitialAndroid: string | null;
  rewardedAndroid: string | null;
  iosAppId: string | null;
  bannerIos: string | null;
  interstitialIos: string | null;
  rewardedIos: string | null;
}

@Injectable()
export class AdmobService {
  constructor(
    @InjectRepository(AdmobConfig) private readonly repo: Repository<AdmobConfig>,
  ) {}

  async get(): Promise<AdmobConfig> {
    const existing = await this.repo.findOne({ where: {} });
    if (existing) return existing;

    // Crear registro vacío la primera vez
    const config = this.repo.create({ enabled: false, testMode: true });
    return this.repo.save(config);
  }

  async update(dto: Partial<AdmobConfigDto>): Promise<AdmobConfig> {
    const config = await this.get();
    Object.assign(config, dto);
    return this.repo.save(config);
  }
}
