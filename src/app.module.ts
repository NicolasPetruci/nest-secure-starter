import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './auth/jwt-auth.guard.js';
import { RolesGuard } from './auth/roles.guard.js';
import { RecordsModule } from './records/records.module.js';

@Module({
  imports: [AuthModule, RecordsModule],
  providers: [
    // Guards globais: toda rota exige token, a menos que seja marcada com @Public().
    // A ordem importa: primeiro autentica, depois checa o papel.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
