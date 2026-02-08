import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';

@Controller('api/users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getProfile(@CurrentUser() currentUser: { sub: string }) {
    const user = await this.usersService.findById(currentUser.sub);
    if (!user) throw new NotFoundException('User not found');
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      createdAt: user.createdAt,
    };
  }

  @Put('me/api-key')
  async saveApiKey(
    @CurrentUser() currentUser: { sub: string },
    @Body('apiKey') apiKey: string,
  ) {
    await this.usersService.saveApiKey(currentUser.sub, apiKey);
    return { ok: true };
  }

  @Get('me/api-key')
  async getApiKey(@CurrentUser() currentUser: { sub: string }) {
    const apiKey = await this.usersService.getApiKey(currentUser.sub);
    return { apiKey };
  }
}
