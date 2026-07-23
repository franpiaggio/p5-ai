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

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60_000; // 15 minutes

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private googleClient: OAuth2Client;

  // Per-username failed-login tracking for account lockout. In-memory, so it is
  // per-instance — fine for the single-process deployment; a multi-instance
  // setup would need a shared store (Redis). Trade-off: an attacker can lock a
  // known username by spamming wrong passwords, acceptable for this app's tiny
  // account set and preferable to leaving admin brute-forceable.
  private readonly failedLogins = new Map<
    string,
    { count: number; lastFailureAt: number; lockedUntil: number }
  >();

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

    if (adminPassword.length < 12) {
      this.logger.warn(
        'ADMIN_PASSWORD is weak (<12 chars). The admin account is the main ' +
          'brute-force target — use a long, unique password.',
      );
    }

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
    const key = username.toLowerCase();
    this.assertNotLocked(key);

    const user = await this.usersService.findByUsername(username);
    if (!user || !user.password) {
      this.recordFailure(key);
      throw new UnauthorizedException('Invalid username or password');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      this.recordFailure(key);
      throw new UnauthorizedException('Invalid username or password');
    }

    this.failedLogins.delete(key);
    return this.generateTokenResponse(user);
  }

  private assertNotLocked(key: string) {
    const entry = this.failedLogins.get(key);
    if (entry && entry.lockedUntil > Date.now()) {
      throw new UnauthorizedException(
        'Too many failed attempts. Try again later.',
      );
    }
  }

  private recordFailure(key: string) {
    const now = Date.now();
    const entry = this.failedLogins.get(key);
    // Keep counting within a rolling window; a long-idle key starts fresh.
    const withinWindow = !!entry && now - entry.lastFailureAt < LOCKOUT_MS;
    const count = withinWindow ? entry.count + 1 : 1;
    this.failedLogins.set(key, {
      count,
      lastFailureAt: now,
      lockedUntil: count >= MAX_FAILED_ATTEMPTS ? now + LOCKOUT_MS : 0,
    });
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
    storeApiKeys?: boolean;
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
        storeApiKeys: user.storeApiKeys ?? false,
      },
    };
  }
}
