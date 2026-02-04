import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

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
  ) {}

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
}
