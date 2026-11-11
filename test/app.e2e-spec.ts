import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';

describe('nest-secure-starter (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  async function login(username: string, password: string) {
    const res = await http().post('/auth/login').send({ username, password }).expect(200);
    return res.body as { accessToken: string; refreshToken: string };
  }

  describe('autenticação', () => {
    it('rejeita requisição sem token (401)', async () => {
      await http().get('/records').expect(401);
    });

    it('rejeita token adulterado (401)', async () => {
      const { accessToken } = await login('ana', 'senha-da-ana');
      await http().get('/records').set('Authorization', `Bearer ${accessToken}x`).expect(401);
    });

    it('responde igual para senha errada e usuário inexistente', async () => {
      const wrongPassword = await http().post('/auth/login').send({ username: 'ana', password: 'errada' });
      const unknownUser = await http().post('/auth/login').send({ username: 'ninguem', password: 'errada' });
      expect(wrongPassword.status).toBe(401);
      expect(unknownUser.status).toBe(401);
      expect(wrongPassword.body.message).toBe(unknownUser.body.message);
    });

    it('rejeita campo não declarado no DTO (400)', async () => {
      await http()
        .post('/auth/login')
        .send({ username: 'ana', password: 'senha-da-ana', role: 'admin' })
        .expect(400);
    });
  });

  describe('autorização por papel (RBAC)', () => {
    it('recepção está autenticada, mas não lê prontuários (403)', async () => {
      const { accessToken } = await login('carla', 'senha-da-carla');
      await http().get('/records').set('Authorization', `Bearer ${accessToken}`).expect(403);
    });
  });

  describe('autorização em nível de objeto (IDOR / BOLA)', () => {
    it('médica lê o próprio prontuário (200)', async () => {
      const { accessToken } = await login('ana', 'senha-da-ana');
      const res = await http().get('/records/r1').set('Authorization', `Bearer ${accessToken}`).expect(200);
      expect(res.body.id).toBe('r1');
    });

    it('médica NÃO lê o prontuário de outro médico trocando o id na URL (403)', async () => {
      const { accessToken } = await login('ana', 'senha-da-ana');
      const res = await http().get('/records/r3').set('Authorization', `Bearer ${accessToken}`).expect(403);
      expect(JSON.stringify(res.body)).not.toContain('Paciente Exemplo C');
    });

    it('a listagem só traz os prontuários da própria médica', async () => {
      const { accessToken } = await login('ana', 'senha-da-ana');
      const res = await http().get('/records').set('Authorization', `Bearer ${accessToken}`).expect(200);
      expect(res.body.map((r: { id: string }) => r.id)).toEqual(['r1', 'r2']);
    });

    it('admin lê qualquer prontuário (200)', async () => {
      const { accessToken } = await login('diego', 'senha-do-diego');
      await http().get('/records/r3').set('Authorization', `Bearer ${accessToken}`).expect(200);
    });
  });

  describe('rotação de refresh token', () => {
    it('troca o refresh token por um par novo', async () => {
      const first = await login('ana', 'senha-da-ana');
      const res = await http().post('/auth/refresh').send({ refreshToken: first.refreshToken }).expect(200);
      expect(res.body.refreshToken).not.toBe(first.refreshToken);
      await http().get('/records').set('Authorization', `Bearer ${res.body.accessToken}`).expect(200);
    });

    it('reuso de um refresh token já consumido revoga a família inteira', async () => {
      const first = await login('bruno', 'senha-do-bruno');
      const second = await http().post('/auth/refresh').send({ refreshToken: first.refreshToken }).expect(200);

      // Alguém reapresenta o token antigo (roubado ou repetido): é recusado...
      await http().post('/auth/refresh').send({ refreshToken: first.refreshToken }).expect(401);
      // ...e o token novo, que era legítimo, também deixa de valer.
      await http().post('/auth/refresh').send({ refreshToken: second.body.refreshToken }).expect(401);
    });

    it('logout invalida o refresh token', async () => {
      const { refreshToken } = await login('ana', 'senha-da-ana');
      await http().post('/auth/logout').send({ refreshToken }).expect(204);
      await http().post('/auth/refresh').send({ refreshToken }).expect(401);
    });
  });
});
