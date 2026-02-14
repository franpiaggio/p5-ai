import {
  Controller,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';

const VALID_PROVIDERS = ['openai', 'anthropic', 'deepseek'];

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
      storeApiKeys: user.storeApiKeys,
      createdAt: user.createdAt,
    };
  }

  @Patch('me/preferences')
  async updatePreferences(
    @CurrentUser() currentUser: { sub: string },
    @Body('storeApiKeys') storeApiKeys: boolean,
  ) {
    if (typeof storeApiKeys !== 'boolean') {
      throw new BadRequestException('storeApiKeys must be a boolean');
    }
    await this.usersService.updateStoreApiKeys(currentUser.sub, storeApiKeys);
    return { ok: true };
  }

  @Put('me/api-keys/:provider')
  async saveProviderKey(
    @CurrentUser() currentUser: { sub: string },
    @Param('provider') provider: string,
    @Body('apiKey') apiKey: string,
  ) {
    if (!VALID_PROVIDERS.includes(provider)) {
      throw new BadRequestException(
        `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}`,
      );
    }
    await this.usersService.saveProviderKey(currentUser.sub, provider, apiKey);
    return { ok: true };
  }

  @Get('me/api-keys')
  async getProviderKeys(@CurrentUser() currentUser: { sub: string }) {
    const keys = await this.usersService.getMaskedProviderKeys(currentUser.sub);
    return { keys };
  }

  @Delete('me/api-keys/:provider')
  async clearProviderKey(
    @CurrentUser() currentUser: { sub: string },
    @Param('provider') provider: string,
  ) {
    if (!VALID_PROVIDERS.includes(provider)) {
      throw new BadRequestException(
        `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}`,
      );
    }
    await this.usersService.clearProviderKey(currentUser.sub, provider);
    return { ok: true };
  }
}
