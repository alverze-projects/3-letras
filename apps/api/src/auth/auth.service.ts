import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import type { AuthResponseDto, GuestLoginDto, LoginDto, RegisterDto } from '@3letras/dtos';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async loginAsGuest(dto: GuestLoginDto): Promise<AuthResponseDto> {
    const nickname = dto.nickname.trim().slice(0, 20);
    const suffix = Math.floor(Math.random() * 9000) + 1000;
    const uniqueNickname = `${nickname}#${suffix}`;

    const user = this.userRepo.create({
      nickname: uniqueNickname,
      isGuest: true,
      email: null,
      passwordHash: null,
    });
    await this.userRepo.save(user);

    return this.buildAuthResponse(user);
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existingEmail = await this.userRepo.findOneBy({ email: dto.email });
    if (existingEmail) throw new ConflictException('Email already in use');

    const existingNickname = await this.userRepo.findOneBy({ nickname: dto.nickname });
    if (existingNickname) throw new ConflictException('Nickname already in use');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      nickname: dto.nickname.trim(),
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      isGuest: false,
    });
    await this.userRepo.save(user);

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userRepo.findOneBy({ email: dto.email.toLowerCase() });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: User): AuthResponseDto {
    const payload = { sub: user.id, nickname: user.nickname, isGuest: user.isGuest };
    return {
      accessToken: this.jwtService.sign(payload),
      player: {
        id: user.id,
        nickname: user.nickname,
        isGuest: user.isGuest,
        email: user.email ?? undefined,
      },
    };
  }
}
