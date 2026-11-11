import { Injectable } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { REFRESH_TOKEN_TTL_MS } from '../config.js';

interface StoredToken {
  userId: string;
  familyId: string;
  expiresAt: number;
  used: boolean;
}

export type ConsumeResult =
  | { ok: true; userId: string; familyId: string }
  | { ok: false; reason: 'unknown' | 'expired' | 'reused' };

/**
 * Refresh tokens opacos com rotação.
 *
 * - O token é um valor aleatório; guardamos só o SHA-256 dele. Se este
 *   armazenamento vazar, os tokens em si não vazam junto.
 * - Cada refresh consome o token e emite outro da mesma "família".
 * - Se um token já consumido aparecer de novo, alguém o copiou: a família
 *   inteira é revogada e o usuário precisa logar outra vez.
 *
 * Em memória, para a demo. Em produção isto vai para banco ou Redis.
 */
@Injectable()
export class RefreshTokenStore {
  private readonly tokens = new Map<string, StoredToken>();

  private static hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  issue(userId: string, familyId: string = randomUUID()): string {
    const token = randomBytes(32).toString('base64url');
    this.tokens.set(RefreshTokenStore.hash(token), {
      userId,
      familyId,
      expiresAt: Date.now() + REFRESH_TOKEN_TTL_MS,
      used: false,
    });
    return token;
  }

  consume(token: string): ConsumeResult {
    const stored = this.tokens.get(RefreshTokenStore.hash(token));
    if (!stored) return { ok: false, reason: 'unknown' };

    if (stored.used) {
      this.revokeFamily(stored.familyId);
      return { ok: false, reason: 'reused' };
    }
    if (stored.expiresAt < Date.now()) {
      return { ok: false, reason: 'expired' };
    }

    stored.used = true;
    return { ok: true, userId: stored.userId, familyId: stored.familyId };
  }

  /** Revoga a família do token informado (logout). Token desconhecido é ignorado. */
  revokeByToken(token: string): void {
    const stored = this.tokens.get(RefreshTokenStore.hash(token));
    if (stored) this.revokeFamily(stored.familyId);
  }

  private revokeFamily(familyId: string): void {
    for (const [hash, stored] of this.tokens) {
      if (stored.familyId === familyId) this.tokens.delete(hash);
    }
  }
}
