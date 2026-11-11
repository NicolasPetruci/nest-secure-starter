import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ACCESS_TOKEN_TTL_SECONDS, jwtSecret } from '../config.js';
import { UsersStore } from '../users/users.store.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { RefreshTokenStore } from './refresh-token.store.js';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: jwtSecret(),
        signOptions: { expiresIn: ACCESS_TOKEN_TTL_SECONDS, algorithm: 'HS256' },
        // Fixar o algoritmo na verificação impede que um token forjado escolha outro.
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UsersStore, RefreshTokenStore],
  exports: [JwtModule],
})
export class AuthModule {}
