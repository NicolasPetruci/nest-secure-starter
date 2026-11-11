import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../common/auth-user.js';

export interface MedicalRecord {
  id: string;
  doctorId: string; // médico responsável: o "dono" do registro
  patientName: string;
  summary: string;
}

/** Prontuários fictícios, em memória. Nenhum dado aqui é real. */
const RECORDS: MedicalRecord[] = [
  { id: 'r1', doctorId: 'u1', patientName: 'Paciente Exemplo A', summary: 'Consulta de rotina. Sem alterações.' },
  { id: 'r2', doctorId: 'u1', patientName: 'Paciente Exemplo B', summary: 'Retorno em 30 dias.' },
  { id: 'r3', doctorId: 'u2', patientName: 'Paciente Exemplo C', summary: 'Solicitado exame de imagem.' },
];

@Injectable()
export class RecordsService {
  listFor(user: AuthUser): MedicalRecord[] {
    if (user.role === 'admin') return RECORDS;
    return RECORDS.filter((r) => r.doctorId === user.id);
  }

  /**
   * Autorização em nível de objeto. O guard de papel já deixou passar
   * (o usuário é médico ou admin), mas isso não basta: um médico só lê
   * os prontuários pelos quais responde. Sem esta checagem, trocar o id
   * na URL devolveria o prontuário de outro médico (IDOR / BOLA).
   *
   * A regra fica no serviço, e não no controller, para valer em qualquer
   * caminho que chegue ao dado.
   */
  findOneFor(user: AuthUser, id: string): MedicalRecord {
    const record = RECORDS.find((r) => r.id === id);
    if (!record) throw new NotFoundException('Prontuário não encontrado.');

    const isOwner = record.doctorId === user.id;
    if (user.role !== 'admin' && !isOwner) {
      throw new ForbiddenException('Você não é responsável por este prontuário.');
    }
    return record;
  }
}
