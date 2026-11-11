/**
 * Configuração lida do ambiente. Não existe valor padrão para o segredo:
 * se ele faltar, a aplicação não sobe. Um default "de desenvolvimento"
 * é exatamente o tipo de coisa que acaba indo para produção.
 */
export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET ausente ou curto demais (mínimo de 32 caracteres). Veja .env.example.',
    );
  }
  return secret;
}

export const ACCESS_TOKEN_TTL_SECONDS = 10 * 60; // 10 minutos
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias
