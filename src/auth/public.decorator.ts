import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/** Marca uma rota como acessível sem token. O padrão é exigir autenticação. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
