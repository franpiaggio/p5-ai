import { Controller, Post, Body, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { LoginDto } from './dto/login.dto';

// Tight per-IP cap on the credential endpoints: brute-forcing the admin account
// is the main threat here. Active in production, where the global ThrottlerGuard
// is registered (see app.module.ts). Account-level lockout in AuthService is the
// environment-independent backstop.
const AUTH_THROTTLE = { short: { limit: 5, ttl: 60_000 } };

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Throttle(AUTH_THROTTLE)
  @Post('google')
  async googleAuth(@Body() body: GoogleAuthDto, @Res() res: Response) {
    const result = await this.authService.googleLogin(body.credential);
    this.setAuthCookie(res, result.accessToken);
    res.json(result);
  }

  @Throttle(AUTH_THROTTLE)
  @Post('login')
  async login(@Body() body: LoginDto, @Res() res: Response) {
    const result = await this.authService.login(body.username, body.password);
    this.setAuthCookie(res, result.accessToken);
    res.json(result);
  }

  @Post('logout')
  async logout(@Res() res: Response) {
    res.clearCookie('token', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
    res.json({ ok: true });
  }

  private setAuthCookie(res: Response, token: string) {
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }
}
