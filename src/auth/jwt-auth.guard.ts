import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthUser } from '../common/auth-user.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';

/** Autenticação: responde "quem é você?". Não decide o que você pode acessar. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers['authorization'];
    const [scheme, token] = header?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token de acesso ausente.');
    }

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; username: string; role: AuthUser['role'] }>(token);
      const user: AuthUser = { id: payload.sub, username: payload.username, role: payload.role };
      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Token de acesso inválido ou expirado.');
    }
  }
}
