import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { GamePlayer } from '../entities/game-player.entity';

export interface IUserSummary {
  id: string;
  nickname: string;
  email: string | null;
  isGuest: boolean;
  isAdmin: boolean;
  gamesPlayed: number;
  createdAt: string;
}

export interface CreateUserDto {
  nickname: string;
  email: string;
  password: string;
  isAdmin: boolean;
}

export interface UpdateUserDto {
  nickname?: string;
  email?: string;
  password?: string;
  isAdmin?: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(GamePlayer) private readonly gpRepo: Repository<GamePlayer>,
  ) {}

  async listAll(): Promise<IUserSummary[]> {
    const users = await this.userRepo.find({
      relations: ['gamePlayers'],
      order: { createdAt: 'DESC' },
      take: 500,
    });
    return users.map((u) => this.toSummary(u));
  }

  async getOne(id: string): Promise<IUserSummary> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['gamePlayers'],
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return this.toSummary(user);
  }

  async create(dto: CreateUserDto): Promise<IUserSummary> {
    const nicknameExists = await this.userRepo.findOneBy({ nickname: dto.nickname });
    if (nicknameExists) throw new ConflictException('El nickname ya está en uso');

    const emailExists = await this.userRepo.findOneBy({ email: dto.email });
    if (emailExists) throw new ConflictException('El email ya está registrado');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      nickname: dto.nickname,
      email: dto.email,
      passwordHash,
      isGuest: false,
      isAdmin: dto.isAdmin,
    });
    await this.userRepo.save(user);
    return this.toSummary(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<IUserSummary> {
    const user = await this.userRepo.findOne({ where: { id }, relations: ['gamePlayers'] });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (dto.nickname !== undefined && dto.nickname !== user.nickname) {
      const exists = await this.userRepo.findOneBy({ nickname: dto.nickname });
      if (exists) throw new ConflictException('El nickname ya está en uso');
      user.nickname = dto.nickname;
    }

    if (dto.email !== undefined && dto.email !== user.email) {
      const exists = await this.userRepo.findOneBy({ email: dto.email });
      if (exists) throw new ConflictException('El email ya está registrado');
      user.email = dto.email;
    }

    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
      user.isGuest = false;
    }

    if (dto.isAdmin !== undefined) {
      user.isAdmin = dto.isAdmin;
    }

    await this.userRepo.save(user);
    return this.toSummary(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id }, relations: ['gamePlayers'] });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (user.gamePlayers && user.gamePlayers.length > 0) {
      throw new BadRequestException(
        `No se puede eliminar: el usuario participó en ${user.gamePlayers.length} partida(s)`,
      );
    }

    await this.userRepo.remove(user);
  }

  async getGames(userId: string) {
    if (!(await this.userRepo.existsBy({ id: userId }))) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const entries = await this.gpRepo.find({
      where: { userId },
      relations: ['game'],
      order: { game: { createdAt: 'DESC' } },
    });

    return entries.map((gp) => ({
      id: gp.game.id,
      code: gp.game.code,
      status: gp.game.status,
      difficulty: gp.game.difficulty,
      totalRounds: gp.game.totalRounds,
      score: gp.totalScore,
      isHost: gp.userId === gp.game.hostId,
      createdAt: gp.game.createdAt.toISOString(),
    }));
  }

  private toSummary(user: User): IUserSummary {
    return {
      id: user.id,
      nickname: user.nickname,
      email: user.email,
      isGuest: user.isGuest,
      isAdmin: user.isAdmin,
      gamesPlayed: user.gamePlayers?.length ?? 0,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
