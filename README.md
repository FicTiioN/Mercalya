# Mercalya

Sistema de gestão para minimercados, mercados de condomínio, lojas autônomas e pequenos
varejistas. Operação robusta de estoque, compras e abastecimento — sem a sensação de ERP.

**Fase atual:** o sistema inteiro roda sobre a API e o Postgres. **Não há mais mock no
frontend** — a migração é módulo a módulo, para a
demonstração nunca ficar quebrada no meio.

## Estrutura

```
apps/
  web/          frontend React + Vite (funcionando)
  api/          backend NestJS + Prisma (auth + catálogo + estoque + vendas)
  mobile/       futuro
packages/
  domain/       tipos do domínio, compartilhados entre web, api e mobile
docs/           auditoria visual e arquitetura do frontend
references/     referências visuais do produto
```

`packages/domain` é **só tipos**, sem código executável — consumido direto do fonte, sem
passo de build. Quando a API existir, os dois lados importam o mesmo contrato: mudou de um
lado, o typecheck do outro quebra na hora.

## Rodando

```bash
npm install
npm run dev
```

Abre em <http://localhost:5173>.

| Script (na raiz) | O que faz |
|---|---|
| `npm run dev` | dev server do `apps/web` |
| `npm run build` | typecheck + build de produção |
| `npm run lint` | ESLint em todos os workspaces (zero warnings) |
| `npm run typecheck` | TypeScript em todos os workspaces |
| `npm test` | testes de integração da API contra um Postgres real (`mercalya_test`) |
| `npm run dev:api` | API NestJS em <http://localhost:3000/api> |
| `npm run db:up` / `db:down` | Postgres via docker-compose |
| `npm run db:migrate` | aplica as migrações |
| `npm run db:seed` | empresa, admin, central, loja, categorias e marcas |

## Demonstração funcional

O fluxo abaixo funciona de ponta a ponta e os saldos se mantêm coerentes:

1. **Cadastrar produto** → aparece na listagem com **estoque 0** e custo não calculado.
2. **Cadastrar fornecedor** → aparece na listagem (sem histórico fictício).
3. **Nova compra** → cria lotes, credita o estoque central, calcula o custo médio e gera
   uma movimentação `ENTRADA`.
4. **Abastecer loja** → transfere do central para a loja. O central diminui, a loja aumenta
   e **o total global permanece igual**; gera `TRANSFERENCIA`.
5. **Registrar perda** → reduz o estoque e gera `PERDA`.
6. **Vender no totem** (`/totem`, aberto por Configurações → Autoatendimento) → o cliente
   passa o código de barras, escolhe cartão ou Pix e paga na **maquininha simulada** — a
   própria tela tem os botões "aproximar cartão" / "emissor recusa". A venda congela o
   preço da loja, debita a prateleira por FEFO e gera `VENDA`; **cancelar** devolve aos
   mesmos lotes e estorna. A **conciliação** fecha o que o totem perder por queda de rede.
7. **Movimentações** e **Painel gerencial** refletem tudo isso.

Os dados ficam no Postgres. Para voltar ao estado inicial: `npm run db:seed` (apaga e recria
a base de demonstração — inclusive outras contas criadas com `db:nova-conta`).

## Decisões de domínio já tomadas

Definidas antes de modelar o banco, porque afetam o schema:

| Tema | Decisão |
|---|---|
| **Multi-loja** | Uma empresa tem N lojas, geridas em Configurações → Lojas e trocadas pelo menu da conta. O estoque central é **único por empresa** e abastece todas. Central por loja fica para uma segunda fase. |
| **Venda** | Debita o estoque **da loja** e registra movimentação. |
| **Usuários** | Só administrador nesta fase — mas `usuario` já nasce com `papel` e `empresa_id`. |
| **Cliente** | Entidade própria, **sem campos obrigatórios**. Documento e telefone únicos quando preenchidos, para permitir deduplicar depois. |

## Backend

NestJS + Prisma + PostgreSQL, em TypeScript — mesma linguagem do frontend, para
compartilhar `packages/domain`. Schema com 21 tabelas e `Empresa` como raiz
multi-tenant. Detalhes e o porquê de cada decisão em
[`docs/BACKEND_ARCHITECTURE.md`](docs/BACKEND_ARCHITECTURE.md).

```bash
npm run db:up && npm run db:migrate && npm run db:seed
npm run dev:api
```

O app exige login: `admin@mercalya.com.br` / `mercalya`. **Com a API fora do ar não dá
para entrar** — a autenticação é real.

Os testes de integração (`npm test`) rodam contra um banco `mercalya_test` no mesmo Postgres,
criado e migrado sozinho na primeira execução. Eles travam as invariantes do núcleo — saldo
nunca negativo, FEFO, custo médio, transação atômica, idempotência da venda, identidade
contábil — que antes eram verificadas à mão.

> Esta máquina já roda um **Postgres nativo na 5432**, então o `docker-compose`
> publica a **5433**. As duas URLs estão prontas em `apps/api/.env.example`.

## Pendências conhecidas do frontend

- Campos sem UI: `pontoCompra`, `estoqueMaximoCentral`, controle de validade, `estoqueIdeal`.
- Compras não têm edição, cancelamento, devolução ao fornecedor nem contas a pagar.
- Totem: só maquininha simulada por enquanto. O adquirente real (Mercado Pago Point) entra
  como mais um adaptador na API, sem mudar a tela — exige CNPJ, conta e terminal.
- Totem: não recebe dinheiro (sem operador, não há troco) e não emite documento fiscal.
- Exportações são apenas toast.

## Contas de demonstração

| Conta | Login | O que tem |
|---|---|---|
| Demonstração | `admin@mercalya.com.br` / `mercalya` | catálogo completo, compras, estoque e 94 vendas |
| Cliente novo | `vila@mercalya.com.br` / `vila123` | **base vazia** — só empresa, usuário, central e loja |

A segunda existe para exercitar as telas no estado em que um cliente real as encontra no
primeiro dia. Criar outra:

```bash
npm run db:nova-conta -- --nome "Mercado X" --email dono@x.com --senha 123456
```

## Documentação

- [`docs/VISUAL_REFERENCE_AUDIT.md`](docs/VISUAL_REFERENCE_AUDIT.md) — auditoria das
  referências visuais, tokens, componentes identificados e divergências resolvidas.
- [`docs/FRONTEND_ARCHITECTURE.md`](docs/FRONTEND_ARCHITECTURE.md) — shell, rotas, Services,
  regras de negócio e o caminho para substituir os mocks pela API.
- [`docs/BACKEND_ARCHITECTURE.md`](docs/BACKEND_ARCHITECTURE.md) — schema, multi-tenant,
  decisões de tipos e o que falta implementar.
