import { Controller, Get, Param } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator.js';
import { type AuthUser, CurrentUser } from '../common/auth-user.js';
import { type MedicalRecord, RecordsService } from './records.service.js';

@Controller('records')
@Roles('medico', 'admin') // recepção não lê prontuário
export class RecordsController {
  constructor(private readonly records: RecordsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): MedicalRecord[] {
    return this.records.listFor(user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string): MedicalRecord {
    return this.records.findOneFor(user, id);
  }
}
