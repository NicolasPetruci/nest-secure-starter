import { Injectable } from '@nestjs/common';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { Role } from '../common/auth-user.js';

export interface User {
  id: string;
  username: string;
  role: Role;
  passwordHash: string; // "salt:hash", ambos em hex
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(actual, expected);
}

/**
 * Usuários de demonstração, em memória. As senhas estão no código porque
 * são dados fictícios de exemplo; num sistema real elas nunca estariam aqui.
 */
@Injectable()
export class UsersStore {
  private readonly users: User[] = [
    { id: 'u1', username: 'ana', role: 'medico', passwordHash: hashPassword('senha-da-ana') },
    { id: 'u2', username: 'bruno', role: 'medico', passwordHash: hashPassword('senha-do-bruno') },
    { id: 'u3', username: 'carla', role: 'recepcao', passwordHash: hashPassword('senha-da-carla') },
    { id: 'u4', username: 'diego', role: 'admin', passwordHash: hashPassword('senha-do-diego') },
  ];

  findByUsername(username: string): User | undefined {
    return this.users.find((u) => u.username === username);
  }

  findById(id: string): User | undefined {
    return this.users.find((u) => u.id === id);
  }
}
