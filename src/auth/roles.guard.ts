import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthUser, Role } from '../common/auth-user.js';
import { ROLES_KEY } from './roles.decorator.js';

/**
 * Autorização por papel (RBAC): responde "o seu papel pode usar esta rota?".
 * Ainda não responde "este registro específico é seu?" — isso é checado
 * no serviço, recurso por recurso (ver RecordsService.findOneFor).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user: AuthUser | undefined = context.switchToHttp().getRequest().user;
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('Seu papel não tem acesso a este recurso.');
    }
    return true;
  }
}
