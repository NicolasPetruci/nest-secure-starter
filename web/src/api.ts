export interface LogEntry {
  id: number;
  at: string;
  method: string;
  path: string;
  /** Cabeçalho Authorization já abreviado, se a requisição levou token. */
  auth?: string;
  requestBody?: unknown;
  status: number;
  responseBody?: unknown;
  ms: number;
  /** Frase curta explicando o que o resultado significa. */
  note?: string;
}

export interface Session {
  username: string;
  accessToken: string;
  refreshToken: string;
}

export interface MedicalRecord {
  id: string;
  doctorId: string;
  patientName: string;
  summary: string;
}

let nextId = 1;
let listener: (entry: LogEntry) => void = () => {};

/** O App se inscreve aqui para receber cada chamada já registrada. */
export function onLog(fn: (entry: LogEntry) => void): void {
  listener = fn;
}

const short = (token: string): string => `${token.slice(0, 14)}…`;

interface CallOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  accessToken?: string;
  /** Texto por status HTTP, mostrado ao lado do resultado no painel. */
  notes?: Record<number, string>;
}

export interface CallResult<T> {
  status: number;
  body: T | undefined;
}

/** Faz a chamada à API e registra requisição e resposta no painel. */
export async function call<T = unknown>(path: string, options: CallOptions = {}): Promise<CallResult<T>> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  if (options.accessToken) headers['authorization'] = `Bearer ${options.accessToken}`;

  const started = performance.now();
  let status = 0;
  let body: unknown;

  try {
    const res = await fetch(`/api${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    status = res.status;
    const text = await res.text();
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = { erro: 'Não foi possível falar com a API. Ela está rodando em localhost:3000?' };
  }

  listener({
    id: nextId++,
    at: new Date().toLocaleTimeString('pt-BR'),
    method,
    path,
    auth: options.accessToken ? `Bearer ${short(options.accessToken)}` : undefined,
    requestBody: options.body,
    status,
    responseBody: body,
    ms: Math.round(performance.now() - started),
    note: options.notes?.[status],
  });

  return { status, body: body as T | undefined };
}

/** Lê o campo exp (em segundos) do payload do JWT, só para mostrar o relógio. */
export function tokenExpiry(accessToken: string): number | null {
  try {
    const payload = accessToken.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const exp = (JSON.parse(json) as { exp?: number }).exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}
