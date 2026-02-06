import { Controller, Post, Body, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { LoginDto } from './dto/login.dto';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('google')
  async googleAuth(@Body() body: GoogleAuthDto, @Res() res: Response) {
    const result = await this.authService.googleLogin(body.credential);
    this.setAuthCookie(res, result.accessToken);
    res.json(result);
  }

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
