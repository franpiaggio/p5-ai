import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { GoogleAuthDto } from './dto/google-auth.dto';
import type { LoginDto } from './dto/login.dto';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('google')
  async googleAuth(@Body() body: GoogleAuthDto) {
    return this.authService.googleLogin(body.credential);
  }

  @Post('login')
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.username, body.password);
  }
}
