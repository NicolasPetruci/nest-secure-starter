import { SetMetadata } from '@nestjs/common';
import { Role } from '../common/auth-user.js';

export const ROLES_KEY = 'roles';
/** Papéis que podem acessar a rota. Rota sem @Roles() aceita qualquer usuário autenticado. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
