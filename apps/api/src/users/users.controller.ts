import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards, HttpCode, HttpStatus, Query
} from '@nestjs/common';
import { UsersService, CreateUserDto, UpdateUserDto } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

@Controller('users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async listAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('desc') desc?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 15;
    const isDesc = desc !== 'false';
    const result = await this.usersService.listAll(pageNum, limitNum, isDesc);
    return {
      users: result.users,
      total: result.total,
      page: pageNum,
      totalPages: Math.ceil(result.total / limitNum),
    };
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.usersService.getOne(id);
  }

  @Get(':id/games')
  async getGames(@Param('id') id: string) {
    return this.usersService.getGames(id);
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
  }
}
