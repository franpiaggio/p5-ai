import {
  Injectable,
  Inject,
  UnauthorizedException,
  OnModuleInit,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private googleClient: OAuth2Client;

  constructor(
    private jwtService: JwtService,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    private configService: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get('GOOGLE_CLIENT_ID'),
    );
  }

  async onModuleInit() {
    await this.seedAdminUser();
  }

  private async seedAdminUser() {
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');
    if (!adminPassword) return; // Skip seeding if not configured

    const exists = await this.usersService.existsByUsername('admin');
    if (exists) return;

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await this.usersService.createLocalUser({
      username: 'admin',
      password: hashedPassword,
      email: 'admin@localhost',
      name: 'Admin',
    });
    this.logger.log('Seeded admin user from ADMIN_PASSWORD env var');
  }

  async login(username: string, password: string) {
    const user = await this.usersService.findByUsername(username);
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid username or password');
    }

    return this.generateTokenResponse(user);
  }

  async googleLogin(credential: string) {
    let payload;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: credential,
        audience: this.configService.get('GOOGLE_CLIENT_ID'),
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }

    if (!payload) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const user = await this.usersService.findOrCreateFromGoogle({
      googleId: payload.sub,
      email: payload.email!,
      name: payload.name!,
      picture: payload.picture,
    });

    return this.generateTokenResponse(user);
  }

  private generateTokenResponse(user: {
    id: string;
    email: string;
    name: string;
    picture?: string;
  }) {
    const jwtPayload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(jwtPayload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    };
  }
}
