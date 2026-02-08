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

  async saveApiKey(userId: string, apiKey: string): Promise<void> {
    const encrypted = encrypt(apiKey, this.encryptionSecret);
    await this.usersRepository.update(userId, { encryptedApiKey: encrypted });
  }

  async getApiKey(userId: string): Promise<string | null> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['id', 'encryptedApiKey'],
    });
    if (!user?.encryptedApiKey) return null;
    return decrypt(user.encryptedApiKey, this.encryptionSecret);
  }
}
