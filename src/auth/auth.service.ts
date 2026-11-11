import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ACCESS_TOKEN_TTL_SECONDS } from '../config.js';
import { User, UsersStore, hashPassword, verifyPassword } from '../users/users.store.js';
import { RefreshTokenStore } from './refresh-token.store.js';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Hash usado quando o usuário não existe, para o tempo de resposta não
// revelar quais nomes de usuário são válidos.
const DUMMY_HASH = hashPassword('senha-que-ninguem-usa');

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersStore,
    private readonly jwt: JwtService,
    private readonly refreshTokens: RefreshTokenStore,
  ) {}

  async login(username: string, password: string): Promise<TokenPair> {
    const user = this.users.findByUsername(username);
    const valid = verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid) {
      // Mesma mensagem para usuário inexistente e senha errada.
      throw new UnauthorizedException('Usuário ou senha inválidos.');
    }
    return this.issuePair(user);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const result = this.refreshTokens.consume(refreshToken);
    if (!result.ok) {
      throw new UnauthorizedException('Refresh token inválido. Faça login novamente.');
    }
    const user = this.users.findById(result.userId);
    if (!user) throw new UnauthorizedException('Usuário não existe mais.');
    return this.issuePair(user, result.familyId);
  }

  logout(refreshToken: string): void {
    this.refreshTokens.revokeByToken(refreshToken);
  }

  private async issuePair(user: User, familyId?: string): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      username: user.username,
      role: user.role,
    });
    return {
      accessToken,
      refreshToken: this.refreshTokens.issue(user.id, familyId),
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    };
  }
}
