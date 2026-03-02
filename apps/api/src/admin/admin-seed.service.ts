import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { Game } from '../entities/game.entity';

@Injectable()
export class AdminSeedService implements OnModuleInit {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Game) private readonly gameRepo: Repository<Game>,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.closeOrphanGames();
    await this.seedAdminUser();
  }

  private async closeOrphanGames() {
    const result = await this.gameRepo
      .createQueryBuilder()
      .update()
      .set({ status: 'finished' })
      .where('status IN (:...statuses)', { statuses: ['playing', 'waiting'] })
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(`${result.affected} partida(s) sin terminar cerrada(s) al reiniciar`);
    }
  }

  private async seedAdminUser() {
    const email = this.config.get<string>('ADMIN_EMAIL');
    const password = this.config.get<string>('ADMIN_PASSWORD');
    const nickname = this.config.get<string>('ADMIN_NICKNAME', 'Admin');

    if (!email || !password) {
      this.logger.warn('ADMIN_EMAIL / ADMIN_PASSWORD no definidos — seed omitido');
      return;
    }

    const existing = await this.userRepo.findOneBy({ email });
    if (existing) {
      if (!existing.isAdmin) {
        this.logger.warn(`Usuario ${email} existe pero no es admin — no se modificará`);
      }
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await this.userRepo.save(
      this.userRepo.create({ email, passwordHash, nickname, isGuest: false, isAdmin: true }),
    );
    this.logger.log(`Usuario admin creado: ${email}`);
  }
}
