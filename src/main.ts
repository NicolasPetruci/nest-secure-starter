import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';

async function bootstrap(): Promise<void> {
  // Carrega o .env se existir (Node >= 20.12). Em produção as variáveis vêm do ambiente.
  try {
    process.loadEnvFile();
  } catch {
    /* sem .env: segue com as variáveis do ambiente */
  }

  const app = await NestFactory.create(AppModule);
  configureApp(app);
  await app.listen(Number(process.env.PORT ?? 3000));
}

await bootstrap();
