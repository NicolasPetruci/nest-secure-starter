# nest-secure-starter

API NestJS de exemplo com a base de segurança que todo backend deveria ter. O domínio é um prontuário médico fictício: o tipo de sistema em que acessar o registro errado é um incidente, e não só um bug.

Todos os dados são inventados. Nenhum usuário, paciente ou prontuário aqui é real.

## O problema

Estar logado não significa poder acessar tudo. A falha mais comum em APIs é a de autorização em nível de objeto (IDOR, ou BOLA na lista da OWASP para APIs): o usuário está autenticado, tem o papel certo, e troca o `id` na URL para ler o registro de outra pessoa.

Este projeto separa as três perguntas que uma requisição precisa responder:

```
requisição
   │
   ▼
┌──────────────────┐   quem é você?            401 se falhar
│  JwtAuthGuard    │   (autenticação)
└──────────────────┘
   │
   ▼
┌──────────────────┐   seu papel usa esta      403 se falhar
│  RolesGuard      │   rota? (RBAC)
└──────────────────┘
   │
   ▼
┌──────────────────┐   este registro           403 se falhar
│  RecordsService  │   específico é seu?
└──────────────────┘
   │
   ▼
 resposta
```

## O que já está implementado

| Controle | Onde | O que faz |
| --- | --- | --- |
| Autenticação JWT | `src/auth/jwt-auth.guard.ts` | Guard global. Toda rota exige token, exceto as marcadas com `@Public()`. Algoritmo fixado em HS256. |
| Token de acesso curto | `src/config.ts` | Expira em 10 minutos. |
| Rotação de refresh token | `src/auth/refresh-token.store.ts` | Token opaco, guardado só como SHA-256. Cada uso emite um novo; reuso de um token já consumido revoga a família inteira. |
| RBAC | `src/auth/roles.guard.ts` | `@Roles('medico', 'admin')` por rota ou controller. |
| Checagem de dono do recurso | `src/records/records.service.ts` | Médico só lê os prontuários pelos quais responde. Fica no serviço para valer em qualquer caminho até o dado. |
| Validação de entrada | `src/configure-app.ts` | `ValidationPipe` com whitelist: campo não declarado no DTO derruba a requisição com 400. |
| Cabeçalhos HTTP | `src/configure-app.ts` | `helmet` com a configuração padrão. |
| Senhas | `src/users/users.store.ts` | `scrypt` com salt por usuário e comparação em tempo constante. |
| Sem segredo padrão | `src/config.ts` | Sem `JWT_SECRET` de pelo menos 32 caracteres, a aplicação não sobe. |

## Como rodar

Requer Node 20.12 ou superior.

```bash
npm install
cp .env.example .env    # no Windows: copy .env.example .env
# edite o .env e troque o JWT_SECRET
npm run start:dev
```

Usuários de demonstração:

| Usuário | Senha | Papel | Prontuários |
| --- | --- | --- | --- |
| `ana` | `senha-da-ana` | médico | r1, r2 |
| `bruno` | `senha-do-bruno` | médico | r3 |
| `carla` | `senha-da-carla` | recepção | nenhum |
| `diego` | `senha-do-diego` | admin | todos |

Reproduzindo a tentativa de IDOR:

```bash
# 1. login como ana
curl -s -X POST localhost:3000/auth/login \
  -H "content-type: application/json" \
  -d '{"username":"ana","password":"senha-da-ana"}'

# 2. prontuário dela: 200
curl -i localhost:3000/records/r1 -H "Authorization: Bearer <accessToken>"

# 3. prontuário do bruno, só trocando o id: 403
curl -i localhost:3000/records/r3 -H "Authorization: Bearer <accessToken>"
```

## Front de demonstração

A pasta `web/` tem um front em React + Vite que mostra tudo isso na tela, sem `curl`. Cada chamada aparece num painel com o que foi enviado e o que voltou.

Um terminal só, API e front juntos:

```bash
npm run setup     # uma vez: instala o back e o front e cria o .env
npm run dev:all   # sobe os dois; Ctrl+C encerra ambos
```

Abra `http://localhost:5173`. Os botões de prontuário só liberam depois de escolher um usuário.

Se preferir separados: `npm run start:dev` na raiz e `npm run dev` dentro de `web/`. O Vite repassa `/api/*` para a API em `localhost:3000`, então não há CORS para configurar. Se a API estiver em outra porta, use `API_URL=http://localhost:4000 npm run dev`.

O que dá para fazer nele:

- Entrar como `ana`, `bruno`, `carla` ou `diego`, e ver o papel e o tempo restante do token.
- Chamar sem token e com token adulterado (401).
- Como `ana`, tentar abrir o `r3` trocando o id (403). Como `diego`, o mesmo pedido volta 200.
- Como `carla`, tentar listar prontuários: autenticada, mas o papel não serve (403).
- Renovar o refresh token, reapresentar o antigo e ver o token novo também morrer.

O front só chama a API. Toda decisão de acesso continua no servidor; esconder um botão na tela não protege nada.

## Testes

```bash
npm test
```

Os testes cobrem só a API. São 12 testes de ponta a ponta em `test/app.e2e-spec.ts`, que sobem a aplicação com a mesma configuração de produção. O principal é o que tenta ler o prontuário de outro médico e espera 403.

Para ver o teste pegando a falha: em `RecordsService.findOneFor`, comente o bloco que lança `ForbiddenException` e rode `npm test`. O teste de IDOR falha. Desfaça a mudança e ele volta a passar.

## Modelo de ameaças

O que este projeto se propõe a barrar:

- Acesso sem autenticação a qualquer rota não pública.
- Usuário autenticado acessando rota fora do seu papel.
- Usuário autenticado, com o papel certo, lendo registro de outro usuário.
- Token de acesso forjado ou adulterado.
- Refresh token roubado sendo usado depois que o dono legítimo já o rotacionou.
- Atribuição em massa: campos extras no corpo da requisição.
- Descoberta de nomes de usuário válidos pela mensagem de erro do login.

O que ele ainda não cobre:

- Força bruta no login (não há rate limit).
- Auditoria: não há registro de quem leu qual prontuário.
- Persistência: usuários, prontuários e refresh tokens ficam em memória e somem ao reiniciar.
- Revogação de token de acesso antes do vencimento. A janela é de até 10 minutos.
- TLS, CORS e tudo o que depende de onde a API vai ser publicada.

## Próximos passos

- [ ] Interceptor de auditoria: quem leu qual recurso e quando, com nome e documento mascarados no log.
- [ ] Rate limit com `@nestjs/throttler`, mais restrito no `/auth/login`.
- [ ] Workflow de CI com `npm audit` e varredura de segredos.

## Licença

MIT.
