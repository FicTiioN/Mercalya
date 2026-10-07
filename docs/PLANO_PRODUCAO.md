# Plano de produção — quem faz o quê

**Início:** 2026-10-08 · **Etapa atual:** Fase 0 — Fundação (10 dias úteis, de 8 a 22/out)

Este arquivo é o combinado de trabalho para levar o Mercalya à produção. Ele separa o
que o **Claude** desenvolve (código, testes, configuração e documentação no repositório)
do que só o **Leonardo** pode fazer (identidade, dinheiro, senhas, contas e decisões).

Documentos completos (claude.ai):

- [Mercalya — O que falta para produção](https://claude.ai/code/artifact/b510e66f-4764-4b3a-b91c-257c7d6bd68b) — diagnóstico e roadmap
- [Mercalya — Plano dos próximos dias](https://claude.ai/code/artifact/c28e26a2-39a9-4f38-9d53-980d78e0efa2) — passo a passo de cada dia

---

## Regras do combinado

| Claude faz | Leonardo faz |
|---|---|
| Escreve código, testes, migrações, Dockerfile, CI e documentação | Cria contas, aceita termos e paga serviços |
| Roda lint, typecheck e testes antes de cada PR | Revisa e faz o merge de todo PR na `main` |
| Recomenda ferramentas e explica o custo de cada escolha | Decide hospedagem, provedores e gastos |
| Passa o comando para gerar segredos | Gera os segredos reais e cadastra no painel (segredo não passa pelo chat) |
| Escreve o passo a passo de configurações externas | Executa configurações em contas próprias (GitHub, hospedagem, DNS, Sentry) |

**O Claude nunca:** cria contas, digita senhas ou chaves reais, aceita termos de serviço,
altera configurações das suas contas ou faz push/merge sem autorização.

**Fluxo de cada dia:**

1. Claude apresenta o plano do dia.
2. Leonardo confirma (ou ajusta).
3. Claude desenvolve, roda os testes e abre o PR.
4. Leonardo revisa e faz o merge.
5. Leonardo marca os itens concluídos neste arquivo (ou pede ao Claude).

Tempo do Leonardo: cerca de 30 a 60 minutos por dia entre revisão e tarefas externas.

---

## Fase 0 — dia a dia

Legenda: 🤖 Claude · 👤 Leonardo

### Dia 1 · qui 8/out — Consolidar o código

- [x] 🤖 Rodar `lint`, `typecheck` e `test` e corrigir o que falhar (tudo verde: 41 testes, build ok)
- [x] 🤖 `.nvmrc` com Node 20 e `engines` no `package.json` da raiz
- [x] 🤖 `CHANGELOG.md`
- [x] 👤 Autorizar o push da branch `feat/pdv-autoatendimento` e a abertura do PR
- [x] 👤 Revisar e fazer o merge na `main`; criar a tag `v0.1.0` (PR #1, tag em 07/10)

**Pronto quando:** a `main` tem todo o código e os testes passam.

### Dia 2 · sex 9/out — Travar o seed e validar a configuração

- [x] 🤖 Seed e `nova-conta` recusam rodar com `NODE_ENV=production` ou banco fora de `localhost`, salvo `PERMITIR_SEED=sim`
- [x] 🤖 Validação das variáveis de ambiente na subida da API (`DATABASE_URL`, `JWT_SECRET` ≥ 32 caracteres e ≠ `troque-me`, `CORS_ORIGIN` em produção)
- [x] 🤖 `.env.example` atualizado e testes (14 testes novos, 55 no total)
- [x] 👤 Revisar o PR

**Pronto quando:** `NODE_ENV=production npm run db:seed` falha sem tocar no banco.

### Dia 3 · ter 13/out — Segurança básica da API

- [x] 🤖 `@nestjs/throttler`: 5 tentativas de login por minuto (IP + e-mail) e limite geral
- [x] 🤖 `helmet`, limite de corpo (1 MB), `trust proxy`
- [x] 🤖 Testes: 6ª tentativa retorna `429`; cabeçalhos de segurança presentes (7 testes novos, 62 no total)
- [ ] 👤 Revisar o PR

### Dia 4 · qua 14/out — Empacotar a aplicação

- [ ] 🤖 `apps/api/Dockerfile` multi-stage + `.dockerignore`
- [ ] 🤖 Entrada com `prisma migrate deploy && node dist/main.js`
- [ ] 🤖 Build do frontend com `VITE_API_URL` por variável
- [ ] 🤖 `docker-compose.prod.yml` para validar localmente
- [ ] 👤 Deixar o Docker Desktop ligado e revisar o PR

**Pronto quando:** a imagem sobe, aplica as migrações e `/api/health/ready` responde 200.

### Dia 5 · qui 15/out — Integração contínua

- [ ] 🤖 `.github/workflows/ci.yml` (lint, typecheck, testes com Postgres, build da imagem)
- [ ] 🤖 Configuração do Dependabot
- [ ] 👤 Ativar a proteção da `main` no GitHub (merge só com CI verde)
- [ ] 👤 Decidir hospedagem, fila e ferramenta de logs

**Pronto quando:** um PR com teste quebrado fica bloqueado.

### Dia 6 · sex 16/out — Logs e rastreamento de erros

- [ ] 🤖 `nestjs-pino` com `requestId`, `empresaId`, `usuarioId`; senha e token ocultos
- [ ] 🤖 Sentry na API e no frontend; falha da conciliação reportada
- [ ] 👤 Criar o projeto no Sentry e cadastrar o DSN como segredo

### Dia 7 · seg 19/out — Primeiro deploy em staging

- [ ] 🤖 Arquivos de deploy da hospedagem escolhida e roteiro passo a passo
- [ ] 🤖 Ajustes de CORS e URL da API
- [ ] 👤 Criar a conta e o projeto na hospedagem, com Postgres na região mais próxima de São Paulo
- [ ] 👤 Gerar e cadastrar os segredos (`JWT_SECRET`, `DATABASE_URL`, `CORS_ORIGIN`, DSN do Sentry)
- [ ] 👤 Apontar o DNS de `staging.mercalya.com.br` e `api-staging.mercalya.com.br`
- [ ] 👤 Testar login, cadastro e venda no totem a partir de outro computador

### Dia 8 · ter 20/out — Backup, restauração e disponibilidade

- [ ] 🤖 Script que confere um banco restaurado (vendas, saldos, contagens)
- [ ] 🤖 `docs/RUNBOOK.md` (deploy, rollback, restauração, troca de segredo)
- [ ] 👤 Ativar backup diário e PITR no painel
- [ ] 👤 Fazer uma restauração real e anotar o tempo gasto
- [ ] 👤 Configurar o monitor de disponibilidade com alerta por e-mail e WhatsApp

### Dia 9 · qua 21/out — Conciliação segura e modelo do dispositivo

- [ ] 🤖 `pg_try_advisory_lock` na conciliação + teste de execução simultânea
- [ ] 🤖 Entidade `Dispositivo` e migração (via `migrate diff` + `migrate deploy`)
- [ ] 👤 Revisar o modelo antes de aplicar a migração

### Dia 10 · qui 22/out — Acesso próprio do totem

- [ ] 🤖 Código de pareamento (uso único, 10 minutos) e `POST /dispositivos/parear`
- [ ] 🤖 Token de dispositivo com escopo só de venda; revogação
- [ ] 🤖 Tela de dispositivos em Configurações → Autoatendimento
- [ ] 🤖 Testes: `403` fora do escopo, `401` com token revogado
- [ ] 👤 Parear um tablet ou navegador e confirmar o totem sem login de administrador

**Pronto quando:** o `/totem` funciona sem a conta do administrador.

---

## Tarefas externas — só o Leonardo (em paralelo)

| Tarefa | Por que precisa ser você | Prazo | Feito |
|---|---|---|---|
| Abrir o CNPJ do Mercalya com um contador (CNAE de software) | Ato jurídico em seu nome | iniciar até 9/out | [ ] |
| Registrar `mercalya.com.br` no Registro.br | Exige CPF/CNPJ e pagamento | 9/out | [ ] |
| Criar contas: organização GitHub, hospedagem, Sentry, monitor de disponibilidade | Cadastro, termos e cartão | 16/out | [ ] |
| Conseguir 1 lojista piloto e levantar CNPJ, IE, regime, UF e certificado A1 | Relação comercial e dados de terceiros | 16/out | [ ] |
| Contas sandbox em 2 provedores fiscais (ex.: Focus NFe, PlugNotas) | Cadastro em nome da empresa | 22/out | [ ] |
| Conta de desenvolvedor no Mercado Pago (Point) | Cadastro em nome da empresa | 22/out | [ ] |

Quando as contas sandbox existirem, o Claude lê a documentação técnica dos provedores e
monta a comparação para a decisão.

---

## Critérios para encerrar a Fase 0

- [ ] Código na `main` com tag `v0.1.0`, CI obrigatório e `main` protegida
- [x] Seed e `nova-conta` travados fora de dev
- [ ] Login com limite de tentativas, `helmet` ativo
- [ ] Totem com token de dispositivo revogável
- [ ] Staging no ar com HTTPS e deploy automático
- [ ] Backup com PITR e uma restauração cronometrada
- [ ] Erros no Sentry, logs em JSON sem dados sensíveis, alerta de indisponibilidade
- [ ] Conciliação protegida por *advisory lock*
- [ ] `docs/RUNBOOK.md` escrito
- [ ] CNPJ em andamento, domínio registrado, piloto identificado, provedor fiscal escolhido

**Depois da Fase 0:** Fase 1 (usuários e papéis, recuperação de senha, e-mail
transacional, termos e LGPD) e, com CNPJ e piloto, Fase 2 (fiscal NFC-e).
