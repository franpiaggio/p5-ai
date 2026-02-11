import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { encrypt, decrypt } from '../common/crypto.util';

interface CreateGoogleUserData {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}

interface CreateLocalUserData {
  username: string;
  password: string;
  email: string;
  name: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private configService: ConfigService,
  ) {}

  private get encryptionSecret(): string {
    return this.configService.get<string>('JWT_SECRET')!;
  }

  async findOrCreateFromGoogle(data: CreateGoogleUserData): Promise<User> {
    let user = await this.usersRepository.findOne({
      where: { googleId: data.googleId },
    });

    if (user) {
      user.name = data.name;
      user.picture = data.picture ?? user.picture;
      return this.usersRepository.save(user);
    }

    user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { username },
      select: ['id', 'username', 'password', 'email', 'name', 'picture', 'createdAt'],
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async createLocalUser(data: CreateLocalUserData): Promise<User> {
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  async existsByUsername(username: string): Promise<boolean> {
    return this.usersRepository.exists({ where: { username } });
  }

  private async loadKeyMap(userId: string): Promise<Record<string, string>> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['id', 'encryptedApiKey'],
    });
    if (!user?.encryptedApiKey) return {};
    try {
      const decrypted = decrypt(user.encryptedApiKey, this.encryptionSecret);
      if (!decrypted) return {};
      const parsed = JSON.parse(decrypted);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, string>;
      }
      return {};
    } catch {
      // Legacy single-string format or corrupted — treat as empty
      return {};
    }
  }

  private async saveKeyMap(
    userId: string,
    map: Record<string, string>,
  ): Promise<void> {
    const hasKeys = Object.keys(map).length > 0;
    const encrypted = hasKeys
      ? encrypt(JSON.stringify(map), this.encryptionSecret)
      : (null as unknown as string);
    await this.usersRepository.update(userId, { encryptedApiKey: encrypted });
  }

  async saveProviderKey(
    userId: string,
    provider: string,
    apiKey: string,
  ): Promise<void> {
    const map = await this.loadKeyMap(userId);
    map[provider] = apiKey;
    await this.saveKeyMap(userId, map);
  }

  async getProviderKeys(userId: string): Promise<Record<string, string>> {
    return this.loadKeyMap(userId);
  }

  async clearProviderKey(userId: string, provider: string): Promise<void> {
    const map = await this.loadKeyMap(userId);
    delete map[provider];
    await this.saveKeyMap(userId, map);
  }
}
