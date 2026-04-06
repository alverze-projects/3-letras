import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameConfig } from '../entities/game-config.entity';

@Injectable()
export class AppConfigService implements OnModuleInit {
  private readonly logger = new Logger(AppConfigService.name);
  private _turnDurationSeconds: number = 25;
  private _soloRoundDurationSeconds: number = 180;

  constructor(
    @InjectRepository(GameConfig)
    private readonly configRepo: Repository<GameConfig>,
  ) {}

  async onModuleInit() {
    await this.loadConfig();
  }

  private async loadConfig() {
    let config = await this.configRepo.findOneBy({ id: 'singleton' });
    
    // Si no existe, crear la configuración inicial usando el valor predeterminado 25
    if (!config) {
      const defaultDuration = 25;
      config = this.configRepo.create({
        id: 'singleton',
        turnDurationSeconds: defaultDuration,
        soloRoundDurationSeconds: 180,
      });
      await this.configRepo.save(config);
      this.logger.log(`Created default config with duration: ${defaultDuration}s and solo round duration: 180s`);
    }

    this._turnDurationSeconds = config.turnDurationSeconds;
    this._soloRoundDurationSeconds = config.soloRoundDurationSeconds ?? 180;
    this.logger.log(`Configured turn duration to ${this._turnDurationSeconds}s and solo round duration to ${this._soloRoundDurationSeconds}s in memory cache.`);
  }

  get turnDurationMs(): number {
    return this._turnDurationSeconds * 1000;
  }

  get soloRoundDurationMs(): number {
    return this._soloRoundDurationSeconds * 1000;
  }

  async getConfig(): Promise<GameConfig> {
    return this.configRepo.findOneByOrFail({ id: 'singleton' });
  }

  async updateConfig(dto: { turnDurationSeconds?: number; soloRoundDurationSeconds?: number }): Promise<GameConfig> {
    const config = await this.getConfig();
    let updated = false;

    if (dto.turnDurationSeconds !== undefined && dto.turnDurationSeconds >= 3) {
      config.turnDurationSeconds = dto.turnDurationSeconds;
      this._turnDurationSeconds = dto.turnDurationSeconds;
      updated = true;
    }

    if (dto.soloRoundDurationSeconds !== undefined && dto.soloRoundDurationSeconds >= 10) {
      config.soloRoundDurationSeconds = dto.soloRoundDurationSeconds;
      this._soloRoundDurationSeconds = dto.soloRoundDurationSeconds;
      updated = true;
    }

    if (updated) {
      await this.configRepo.save(config);
      this.logger.log(`Updated cache: turnDuration=${this._turnDurationSeconds}s, soloRoundDuration=${this._soloRoundDurationSeconds}s`);
    }
    
    return config;
  }
}
