# Changelog

Todas as mudanças relevantes do Mercalya ficam registradas aqui. O formato segue o
[Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e as versões seguem o
[Versionamento Semântico](https://semver.org/lang/pt-BR/).

Cada PR que muda comportamento acrescenta uma linha em **Não lançado**. Na hora de criar
a tag, a seção vira a versão nova.

## [Não lançado]

### Adicionado

- Validação das variáveis de ambiente na subida da API (`src/config/ambiente.ts`). Em
  produção, a API não sobe com `JWT_SECRET` de exemplo ou com menos de 32 caracteres, nem
  sem `CORS_ORIGIN`. Em desenvolvimento, os mesmos problemas viram aviso. Todos os erros
  aparecem de uma vez, sem expor valores.
- `NODE_ENV`, `PERMITIR_SEED` e `TRUST_PROXY` documentados no `.env.example`.
- Testes HTTP que montam a aplicação como o `main.ts` monta (`supertest`), com a
  configuração compartilhada em `src/configurar-app.ts`.

- Imagens Docker de produção: `apps/api/Dockerfile` (multi-stage, aplica
  `migrate deploy` ao subir, sem root, com healthcheck) e `apps/web/Dockerfile` (nginx com
  fallback de SPA e cache longo para `/assets`).
- `docker-compose.prod.yml` para ensaiar a produção localmente, com banco próprio.
- Scripts `start:prod` e `db:migrate:deploy` na API, para hospedagens sem Docker.

### Alterado

- `prisma` passou para `dependencies`: o `migrate deploy` roda dentro do container.
- O build de produção do frontend falha sem `VITE_API_URL`. Antes, ele apontava em
  silêncio para `http://localhost:3000/api`.

### Segurança

- Limite de tentativas de login: 5 por minuto para a mesma conta a partir do mesmo IP
  (depois disso, bloqueio de 5 minutos) e 30 por minuto por IP. As demais rotas têm
  limite geral de 300 por minuto por IP; o health check fica de fora. O contador é em
  memória, por instância.
- Cabeçalhos de segurança com `helmet` e sem `X-Powered-By`.
- Corpo JSON limitado a 1 MB de forma explícita.
- `TRUST_PROXY` define quantos proxies são confiáveis para obter o IP real do cliente.

- `db:seed` e `db:nova-conta` recusam rodar com `NODE_ENV=production` ou com banco fora
  de `localhost`, a menos que `PERMITIR_SEED=sim` seja informado no próprio comando. Antes,
  o seed apagava todas as tabelas de qualquer banco apontado pelo `DATABASE_URL`.

## [0.1.0] — 2026-10-07

Primeira versão consolidada. O sistema inteiro roda sobre a API e o Postgres, sem mocks.

### Adicionado

- `docs/PLANO_PRODUCAO.md`: o plano até a produção, com o que o Claude e o Leonardo fazem
  em cada dia da Fase 0.
- `CHANGELOG.md` e versão do Node fixada em 20 (`.nvmrc` e `engines`).

- **Monorepo** com `apps/web` (React 18 + Vite + Tailwind), `apps/api` (NestJS 10 +
  Prisma 5 + PostgreSQL 16) e `packages/domain` (tipos compartilhados).
- **Autenticação** JWT com guard global que nega por padrão e tenant vindo do token.
- **Catálogo:** produtos, categorias, marcas e fornecedores, com busca sem acento e preço
  por loja.
- **Compras:** confirmação atômica que cria lote, credita o estoque, recalcula o custo
  médio e grava a movimentação `ENTRADA`.
- **Estoque:** central e loja, saldos por lote, consumo FEFO, abastecimento, perdas,
  ajustes e devolução ao central.
- **Painel, Início e Notificações** com indicadores reais e marca de "lida" por usuário.
- **PDV fase 1:** `Pagamento` como entidade própria; registro e cancelamento de venda
  com devolução aos mesmos lotes; testes de integração contra Postgres.
- **PDV fase 2:** porta `ProvedorPagamento`, maquininha simulada, estorno automático
  quando falta estoque e conciliação de pagamentos pendentes a cada minuto.
- **PDV fase 3:** tela do totem de autoatendimento (`/totem`).
- **Multi-loja:** gestão de lojas em Configurações e loja em contexto no menu da conta.
- Health check de liveness (`/api/health`) e readiness (`/api/health/ready`).
- 41 testes de integração cobrindo as invariantes do núcleo.

[Não lançado]: https://github.com/FicTiioN/Mercalya/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/FicTiioN/Mercalya/releases/tag/v0.1.0
