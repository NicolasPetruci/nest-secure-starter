import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService, TokenPair } from './auth.service.js';
import { LoginDto, RefreshDto } from './dto.js';
import { Public } from './public.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto): Promise<TokenPair> {
    return this.auth.login(dto.username, dto.password);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto): Promise<TokenPair> {
    return this.auth.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  logout(@Body() dto: RefreshDto): void {
    this.auth.logout(dto.refreshToken);
  }
}
