import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameConfig } from '../entities/game-config.entity';

@Injectable()
export class AppConfigService implements OnModuleInit {
  private readonly logger = new Logger(AppConfigService.name);
  private _turnDurationSeconds: number = 25;

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
      });
      await this.configRepo.save(config);
      this.logger.log(`Created default config with duration: ${defaultDuration}s`);
    }

    this._turnDurationSeconds = config.turnDurationSeconds;
    this.logger.log(`Configured turn duration to ${this._turnDurationSeconds}s in memory cache.`);
  }

  get turnDurationMs(): number {
    return this._turnDurationSeconds * 1000;
  }

  async getConfig(): Promise<GameConfig> {
    return this.configRepo.findOneByOrFail({ id: 'singleton' });
  }

  async updateTurnDuration(seconds: number): Promise<GameConfig> {
    const config = await this.getConfig();
    config.turnDurationSeconds = seconds;
    await this.configRepo.save(config);
    
    // Update memory cache
    this._turnDurationSeconds = seconds;
    this.logger.log(`Updated turn duration dynamically to ${seconds}s`);
    
    return config;
  }
}
