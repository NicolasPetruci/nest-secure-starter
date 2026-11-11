import { INestApplication, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

/**
 * Configuração compartilhada entre a aplicação real e os testes e2e,
 * para que o teste exercite exatamente o que roda em produção.
 */
export function configureApp(app: INestApplication): void {
  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // remove campos que o DTO não declara
      forbidNonWhitelisted: true, // e rejeita a requisição se eles vierem
      transform: true,
    }),
  );
}
