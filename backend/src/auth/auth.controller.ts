import { Controller, Post, Body, Res, Ip, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { LoginDto } from './dto/login.dto';
import { OpenRouterConnectDto } from './dto/openrouter-connect.dto';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

// Tight per-IP cap on the password endpoint: brute-forcing the admin account is
// the main threat. Active in production, where the global ThrottlerGuard is
// registered (see app.module.ts). Account-level lockout in AuthService is the
// environment-independent backstop. Google sign-in is NOT capped this tightly —
// it is cryptographically validated (not brute-forceable) and many users can
// share one NAT IP, so it stays on the looser global limit.
const LOGIN_THROTTLE = { short: { limit: 5, ttl: 60_000 } };

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('google')
  async googleAuth(@Body() body: GoogleAuthDto, @Res() res: Response) {
    const result = await this.authService.googleLogin(body.credential);
    this.setAuthCookie(res, result.accessToken);
    res.json(result);
  }

  @Throttle(LOGIN_THROTTLE)
  @Post('login')
  async login(@Body() body: LoginDto, @Ip() ip: string, @Res() res: Response) {
    const result = await this.authService.login(
      body.username,
      body.password,
      ip,
    );
    this.setAuthCookie(res, result.accessToken);
    res.json(result);
  }

  // Finishes the OpenRouter OAuth "connect account" flow. Auth-required: the
  // resulting user-scoped key is stored against the logged-in user.
  @UseGuards(AuthGuard)
  @Post('openrouter/connect')
  async connectOpenRouter(
    @CurrentUser() user: { sub: string },
    @Body() body: OpenRouterConnectDto,
  ) {
    await this.authService.connectOpenRouter(
      user.sub,
      body.code,
      body.codeVerifier,
    );
    return { ok: true };
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
