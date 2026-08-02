import {
  Injectable,
  Inject,
  UnauthorizedException,
  BadRequestException,
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
const MAX_TRACKED_KEYS = 10_000; // hard cap so the map can never grow unbounded

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private googleClient: OAuth2Client;

  // Failed-login tracking for account lockout, keyed by (username, client IP).
  // Scoping to the IP means an attacker can only lock the account *as seen from
  // their own IP* — they cannot lock out the real admin signing in elsewhere —
  // while still slowing a single-source brute force (the per-IP @Throttle caps
  // distributed attempts). In-memory, so per-instance: fine for the single
  // process here; a multi-instance setup would need a shared store (Redis).
  // Entries are pruned on write and hard-capped so the map cannot grow forever.
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

  /**
   * Complete the OpenRouter OAuth PKCE flow: exchange the authorization `code`
   * (plus the client's `codeVerifier`) for a user-scoped OpenRouter API key and
   * store it encrypted against the user. Requests then spend the user's own
   * OpenRouter balance — never the operator's.
   */
  async connectOpenRouter(
    userId: string,
    code: string,
    codeVerifier: string,
  ): Promise<void> {
    let response: globalThis.Response;
    try {
      response = await fetch('https://openrouter.ai/api/v1/auth/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          code_verifier: codeVerifier,
          code_challenge_method: 'S256',
        }),
      });
    } catch {
      throw new BadRequestException('Could not reach OpenRouter to connect.');
    }

    if (!response.ok) {
      throw new BadRequestException(
        'OpenRouter rejected the connection. Please try connecting again.',
      );
    }

    const data = (await response.json()) as { key?: string };
    if (!data.key) {
      throw new BadRequestException('OpenRouter did not return an API key.');
    }

    await this.usersService.saveProviderKey(userId, 'openrouter', data.key);
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

  async login(username: string, password: string, ip = 'unknown') {
    const key = `${username.toLowerCase()}::${ip}`;
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
    this.pruneExpired(now);
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

  // Drop keys whose lockout has elapsed and that are outside the counting
  // window, then hard-cap the map by evicting the oldest entries. Keeps the
  // structure bounded regardless of how many distinct usernames/IPs are tried.
  private pruneExpired(now: number) {
    for (const [k, entry] of this.failedLogins) {
      if (entry.lockedUntil <= now && now - entry.lastFailureAt >= LOCKOUT_MS) {
        this.failedLogins.delete(k);
      }
    }
    if (this.failedLogins.size >= MAX_TRACKED_KEYS) {
      const byAge = [...this.failedLogins.entries()].sort(
        (a, b) => a[1].lastFailureAt - b[1].lastFailureAt,
      );
      const toDrop = this.failedLogins.size - MAX_TRACKED_KEYS + 1;
      for (let i = 0; i < toDrop; i++) this.failedLogins.delete(byAge[i][0]);
    }
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
