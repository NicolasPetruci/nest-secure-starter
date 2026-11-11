import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type Role = 'medico' | 'recepcao' | 'admin';

/** O que o token de acesso carrega e o que os guards anexam em request.user. */
export interface AuthUser {
  id: string;
  username: string;
  role: Role;
}

/** Injeta o usuário autenticado no handler: `@CurrentUser() user: AuthUser`. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest().user,
);
