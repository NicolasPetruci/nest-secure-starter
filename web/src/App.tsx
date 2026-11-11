import { useEffect, useRef, useState } from 'react';
import { type LogEntry, type MedicalRecord, type Session, call, onLog, tokenExpiry } from './api';

const DEMO_USERS = [
  { username: 'ana', password: 'senha-da-ana', label: 'ana', role: 'médico', owns: 'r1, r2' },
  { username: 'bruno', password: 'senha-do-bruno', label: 'bruno', role: 'médico', owns: 'r3' },
  { username: 'carla', password: 'senha-da-carla', label: 'carla', role: 'recepção', owns: 'nenhum' },
  { username: 'diego', password: 'senha-do-diego', label: 'diego', role: 'admin', owns: 'todos' },
];

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [records, setRecords] = useState<MedicalRecord[] | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [targetId, setTargetId] = useState('r3');
  const [opened, setOpened] = useState<{ status: number; record?: MedicalRecord } | null>(null);
  const [now, setNow] = useState(Date.now());
  // Guarda o refresh token que acabou de ser consumido, para simular o reuso.
  const spentRefresh = useRef<string | null>(null);

  useEffect(() => {
    onLog((entry) => setLog((previous) => [entry, ...previous].slice(0, 30)));
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const role = DEMO_USERS.find((u) => u.username === session?.username)?.role;
  const expiresAt = session ? tokenExpiry(session.accessToken) : null;
  const secondsLeft = expiresAt ? Math.max(0, Math.round((expiresAt - now) / 1000)) : null;

  function resetView() {
    setRecords(null);
    setOpened(null);
  }

  async function login(username: string, password: string) {
    resetView();
    spentRefresh.current = null;
    const { status, body } = await call<TokenPair>('/auth/login', {
      method: 'POST',
      body: { username, password },
      notes: { 200: 'Autenticado: o servidor emitiu um par de tokens.', 401: 'Credenciais recusadas.' },
    });
    if (status === 200 && body) setSession({ username, ...body });
    else setSession(null);
  }

  async function loadRecords() {
    setOpened(null);
    const { status, body } = await call<MedicalRecord[]>('/records', {
      accessToken: session?.accessToken,
      notes: {
        200: 'Lista filtrada pelo servidor: só o que este usuário pode ver.',
        401: 'Sem token válido: a requisição nem chega ao serviço.',
        403: 'Autenticado, mas o papel não tem acesso a esta rota.',
      },
    });
    setRecords(status === 200 && body ? body : []);
  }

  async function openRecord() {
    const { status, body } = await call<MedicalRecord>(`/records/${encodeURIComponent(targetId)}`, {
      accessToken: session?.accessToken,
      notes: {
        200: 'Permitido: o usuário é o responsável (ou admin).',
        401: 'Sem token válido.',
        403: 'Bloqueado: autenticado e com papel certo, mas o registro é de outro usuário.',
        404: 'Esse id não existe.',
      },
    });
    setOpened({ status, record: status === 200 ? body : undefined });
  }

  async function callWithoutToken() {
    await call('/records', { notes: { 401: 'Sem token, a API nem olha o resto.' } });
  }

  async function callWithTamperedToken() {
    if (!session) return;
    await call('/records', {
      accessToken: `${session.accessToken}x`,
      notes: { 401: 'Assinatura não confere: token adulterado é recusado.' },
    });
  }

  async function refresh() {
    if (!session) return;
    const old = session.refreshToken;
    const { status, body } = await call<TokenPair>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: old },
      notes: { 200: 'Rotação: o token antigo foi consumido e um novo foi emitido.', 401: 'Refresh token recusado.' },
    });
    if (status === 200 && body) {
      spentRefresh.current = old;
      setSession({ ...session, ...body });
    }
  }

  async function replaySpentRefresh() {
    if (!spentRefresh.current) return;
    await call('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: spentRefresh.current },
      notes: {
        401: 'Reuso detectado: o token já tinha sido usado, então a família inteira foi revogada.',
      },
    });
  }

  async function refreshAfterTheft() {
    if (!session) return;
    await call('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: session.refreshToken },
      notes: {
        200: 'Ainda válido.',
        401: 'O token novo, que era legítimo, também morreu: o usuário precisa logar de novo.',
      },
    });
  }

  return (
    <div className="shell">
      <header className="top">
        <div>
          <h1>nest-secure-starter</h1>
          <p className="sub">Autenticação, papel e dono do recurso: três perguntas diferentes.</p>
        </div>
        <div className="pipeline" aria-label="Ordem das verificações">
          <span>401 quem é você?</span>
          <i>→</i>
          <span>403 seu papel serve?</span>
          <i>→</i>
          <span>403 o registro é seu?</span>
        </div>
      </header>

      <main className="grid">
        <section className="column">
          <div className="card">
            <h2>1. Entrar</h2>
            <div className="users">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.username}
                  className={`user ${session?.username === u.username ? 'active' : ''}`}
                  onClick={() => login(u.username, u.password)}
                >
                  <strong>{u.label}</strong>
                  <span>{u.role}</span>
                  <small>prontuários: {u.owns}</small>
                </button>
              ))}
            </div>
            <div className="row">
              <button className="ghost" onClick={() => login('ana', 'senha-errada')}>
                Senha errada
              </button>
              <button className="ghost" onClick={() => login('ninguem', 'senha-errada')}>
                Usuário inexistente
              </button>
            </div>
            <p className="hint">As duas últimas devem responder exatamente a mesma mensagem.</p>
          </div>

          <div className="card">
            <h2>2. Sessão</h2>
            {session ? (
              <dl className="session">
                <dt>Usuário</dt>
                <dd>
                  {session.username} <span className="tag">{role}</span>
                </dd>
                <dt>Token de acesso</dt>
                <dd className={secondsLeft === 0 ? 'expired' : ''}>
                  {secondsLeft === null ? '—' : secondsLeft === 0 ? 'expirado' : `expira em ${secondsLeft}s`}
                </dd>
                <dt>Refresh token</dt>
                <dd className="mono">{session.refreshToken.slice(0, 14)}…</dd>
              </dl>
            ) : (
              <p className="muted">Nenhuma sessão. Escolha um usuário acima.</p>
            )}
            <div className="row">
              <button className="ghost" onClick={callWithoutToken}>
                Chamar sem token
              </button>
              <button className="ghost" onClick={callWithTamperedToken} disabled={!session}>
                Token adulterado
              </button>
            </div>
          </div>

          <div className="card">
            <h2>3. Prontuários</h2>
            {!session && <p className="muted needs-login">Os botões abaixo liberam depois que você escolher um usuário em “1. Entrar”.</p>}
            <div className="row">
              <button onClick={loadRecords} disabled={!session}>
                Listar os meus
              </button>
            </div>
            {records && (
              <ul className="records">
                {records.length === 0 && <li className="muted">Nenhum prontuário visível.</li>}
                {records.map((r) => (
                  <li key={r.id}>
                    <strong>{r.id}</strong> {r.patientName}
                    <small>{r.summary}</small>
                  </li>
                ))}
              </ul>
            )}

            <div className="attack">
              <h3>Trocar o id na URL</h3>
              <div className="row">
                <code>GET /records/</code>
                <input value={targetId} onChange={(e) => setTargetId(e.target.value)} aria-label="id do prontuário" />
                <button className="danger" onClick={openRecord} disabled={!session}>
                  Tentar abrir
                </button>
              </div>
              {opened && (
                <div className={`verdict s${opened.status}`}>
                  {opened.status === 200 && opened.record
                    ? `${opened.status} — ${opened.record.patientName}: ${opened.record.summary}`
                    : `${opened.status} — nada foi devolvido`}
                </div>
              )}
              <p className="hint">Como ana, o r3 é do bruno: espere 403. Como diego (admin), espere 200.</p>
            </div>
          </div>

          <div className="card">
            <h2>4. Rotação do refresh token</h2>
            <ol className="steps">
              <li>
                <button onClick={refresh} disabled={!session}>
                  Renovar tokens
                </button>
                <span>troca o refresh token por um par novo</span>
              </li>
              <li>
                <button className="danger" onClick={replaySpentRefresh} disabled={!spentRefresh.current}>
                  Reapresentar o token antigo
                </button>
                <span>simula um token roubado sendo usado depois</span>
              </li>
              <li>
                <button className="ghost" onClick={refreshAfterTheft} disabled={!session}>
                  Usar o token novo
                </button>
                <span>o legítimo também deve ter morrido</span>
              </li>
            </ol>
          </div>
        </section>

        <section className="column wide">
          <div className="card log-card">
            <div className="log-head">
              <h2>Requisições</h2>
              <button className="ghost small" onClick={() => setLog([])} disabled={log.length === 0}>
                Limpar
              </button>
            </div>
            {log.length === 0 && <p className="muted">Cada chamada aparece aqui, com o que foi enviado e o que voltou.</p>}
            <ul className="log">
              {log.map((e) => (
                <li key={e.id} className={`entry s${e.status === 0 ? 'x' : Math.floor(e.status / 100)}`}>
                  <div className="line">
                    <span className={`badge b${e.status === 0 ? 'x' : e.status}`}>{e.status === 0 ? 'ERRO' : e.status}</span>
                    <span className="mono">
                      {e.method} {e.path}
                    </span>
                    <span className="time">
                      {e.at} · {e.ms} ms
                    </span>
                  </div>
                  {e.note && <p className="note">{e.note}</p>}
                  {e.auth && <pre className="req">Authorization: {e.auth}</pre>}
                  {e.requestBody !== undefined && <pre className="req">{pretty(e.requestBody)}</pre>}
                  {e.responseBody !== undefined && <pre className="res">{pretty(e.responseBody)}</pre>}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}

/** JSON legível, com tokens abreviados para caber na tela e no print. */
function pretty(value: unknown): string {
  return JSON.stringify(
    value,
    // Só abrevia o que parece token (comprido e sem espaços). Mensagens de erro ficam inteiras.
    (_key, v) => (typeof v === 'string' && v.length > 40 && !/\s/.test(v) ? `${v.slice(0, 18)}…` : v),
    2,
  );
}
