# Mercalya — Arquitetura do Frontend

Fase atual: **frontend completo, sem backend**. Todos os dados passam por Services que hoje
leem mocks e amanhã falarão com a API real, sem alterar nenhuma tela.

---

## Stack

| Camada | Escolha | Motivo |
|---|---|---|
| Build | **Vite 5** | dev server rápido, build enxuto |
| UI | **React 18 + TypeScript strict** | `noUnusedLocals`, `noUnusedParameters`, zero `any` no domínio |
| Rotas | **react-router-dom 6** (`createBrowserRouter`) | rotas aninhadas sob um único App Shell |
| Estilo | **Tailwind CSS 3** | tokens centralizados em `tailwind.config.js` |
| Ícones | **lucide-react** | biblioteca única, outline, cantos arredondados |
| Gráficos | **Recharts** | linha, barra e donut do Painel gerencial |

Alias `@` → `apps/web/src/`. Alias `@mercalya/domain` → `packages/domain/src/`.

Scripts (na raiz do monorepo): `npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` · `npm run preview`.

---

## Estrutura de pastas

O repositório é um **monorepo com npm workspaces**. O frontend deixou de ser a raiz:

```
apps/
  web/                    este frontend
  api/                    backend (NestJS + Prisma) — a criar
  mobile/                 futuro
packages/
  domain/                 tipos do domínio, compartilhados por web, api e mobile
docs/                     auditoria visual e este documento
references/               as referências visuais do produto
```

`packages/domain` contém **só tipos** — nenhum código executa. Por isso é consumido
direto do fonte, sem passo de build: o Vite tem um alias e o TypeScript um `paths`.
Quando a API existir, ela importa os mesmos tipos, e um contrato que mudar de um lado
quebra o typecheck do outro na hora.

As telas continuam importando de `@/models`, que hoje só reexporta o pacote
compartilhado. Isso evitou tocar em 35 arquivos e mantém um lugar para tipos que
sejam exclusivos da web.

Dentro de `apps/web`:

```
src/
  app/
    router.tsx            rotas da aplicação
    navigation.ts         estrutura canônica da sidebar
  components/
    layout/               AppShell, AppSidebar, AppHeader, Logo
    ui/                   design system (Button, Badge, Card, DataTable, Drawer, ...)
  lib/
    cn.ts                 merge de classes
    format.ts             moeda, data, percentual, máscaras
    useRecurso.ts         hook de carregamento (loading / erro / recarregar)
  mocks/                  fonte de dados inicial, relacionada por IDs
  models/                 reexporta @mercalya/domain
  pages/                  uma pasta por módulo
  services/               Services + DataStore + camada de transporte simulada
```

---

## App Shell

`AppShell` monta **uma única vez** a sidebar, o header e o `<Outlet>`. Nenhuma página
redesenha navegação.

- **AppSidebar** — 224 px, `position: fixed`: marca, divisor e navegação com accordions.
  Permanece visível enquanto o conteúdo rola; o conteúdo é deslocado por `lg:pl-sidebar`.
  Abaixo de `lg` vira drawer com overlay. Não repete usuário nem condomínio — ambos foram
  retirados do rodapé por decisão do produto.
- **AppHeader** — 76 px, sticky: busca global (`⌘K`), painel de notificações, menu de ajuda
  e menu do usuário.
- **PageContainer** — padding 32 px e `gap-6` entre blocos; usado por todas as páginas.

### Navegação

`src/app/navigation.ts` é a **única** fonte da estrutura de menu:

```
Início · Painel gerencial · [Cadastros] · [Operação] · Vendas · Configurações
```

Regras dos accordions, implementadas em `AppSidebar`:
1. fechados por padrão;
2. o grupo que contém a rota atual abre automaticamente;
3. abrir um grupo fecha o outro — só um expandido por vez;
4. grupo pai destacado em teal quando contém a rota ativa; subitem ativo com marcador.

---

## Fluxo de dados

```
Componente  →  Service  →  DataStore  →  mocks / localStorage
   (React)     (Promise)   (regras)      (persistência)
```

Regras que a arquitetura garante:

- **Componentes nunca importam mocks nem `localStorage`.** Só conhecem Services.
- **Todo Service devolve `Promise`** e passa por `simular()` (`src/services/api.ts`), que
  aplica um atraso de **200–500 ms**. É isso que permite exercitar skeletons, botões em
  estado `loading` e campos desabilitados durante o envio.
- **O DataStore concentra as regras de estoque** — saldo por lote/local, custo médio
  ponderado, consumo FEFO e registro de movimentações — para que nenhuma tela reimplemente
  uma regra de negócio.
- **Persistência**: o DataStore serializa em `localStorage` (`mercalya:datastore:v5` — a
  versão está na chave, então mudanças de formato descartam snapshots antigos em vez de
  restaurá-los com campos faltando). Se a
  chave não existir, ele semeia a partir de `src/mocks`. "Restaurar dados de demonstração"
  (menu do usuário ou Configurações) apaga a chave e re-semeia.

### Services

| Service | Responsabilidade |
|---|---|
| `ProdutoService` | catálogo, resumo, criação (sempre com estoque 0) |
| `FornecedorService` | listagem, drawer, produtos fornecidos, últimas compras |
| `CompraService` | **única porta de entrada de estoque** do sistema |
| `EstoqueService` | lotes do estoque central, ajuste manual, sugestões |
| `AbastecimentoService` | transferência central → loja |
| `LojaService` | disponibilidade dos produtos na loja, retirada |
| `MovimentacaoService` | histórico, filtros, detalhe e linha do tempo |
| `PerdaService` | registro de perdas, vencimentos, ranking |
| `InicioService` | etapas do guia, progresso, atividades, sugestões |
| `VendaService` | listagem, KPIs, detalhe e linha do tempo das vendas |
| `NotificacaoService` | notificações derivadas de fatos reais + estado de leitura |
| `PainelService` | KPIs, séries e listas do dashboard |

`AppSession` (em `services/index.ts`) expõe usuário, loja e o reset da demonstração — é o
único caminho dos componentes até a sessão.

### Hook de carregamento

```tsx
const { dados, carregando, erro, recarregar } = useRecurso(
  () => ProdutoService.listar({ busca, pagina }),
  [busca, pagina],
)
```

`useRecurso` cancela respostas obsoletas, evita `setState` após desmontagem e expõe
`recarregar()` para revalidar depois de uma escrita.

---

## Três níveis de dados do produto

O erro mais comum aqui seria guardar preço no produto. Preço é decisão **de cada
loja** — o mesmo item pode custar valores diferentes em pontos diferentes. Por isso o
domínio tem três níveis, não dois:

| Nível | Tipo | O que guarda |
|---|---|---|
| Catálogo | `Produto` | nome, EAN, categoria, marca, unidade, conteúdo, controle de validade |
| Compra / central | `Produto` | `pontoCompra`, `estoqueMaximoCentral`, `localizacaoPadrao`, `custoMedio` |
| Comercial por loja | `ConfiguracaoProdutoLoja` | `precoVenda`, `estoqueMinimo`, `estoqueIdeal`, `ativo` |

Duas perguntas distintas que antes compartilhavam o mesmo campo:

- **`pontoCompra`** (central) — *quando comprar do fornecedor?*
- **`estoqueMinimo`** (loja) — *quando repor a prateleira a partir do central?*

Enquanto eram um só campo, os Services derivavam o segundo do primeiro por fatores
fixos (`× 0,4`, `× 0,35`) espalhados em cinco lugares. Esses fatores deixaram de existir:
viraram o **valor inicial** das configurações em `mocks/product-store.mock.ts`, editável
pelo lojista.

**Onde se configura:**

1. **Cadastro do produto → "Preço e reposição por loja"** — o lugar canônico. Uma linha
   por loja com **preço** e **mínimo**. O produto precisa ter preço **antes** do primeiro
   abastecimento, senão chegaria à prateleira sem preço; o Service recusa salvar um
   produto ativo em uma loja sem preço.
2. **Tela Loja → botão de editar (ou clique no preço)** — abre "Configuração nesta loja"
   com **preço**, **estoque mínimo** e **vende nesta loja**. É onde o operador corrige o que
   vê na prateleira, sem passar pelo cadastro. Só toca no que pertence àquela loja: catálogo,
   custo médio e estoque ficam intactos.

Duas regras protegem esse atalho:

- **Não dá para parar de vender um produto que ainda tem saldo na loja** — o saldo ficaria
  órfão (fora da lista, mas ainda contando no estoque). O Service exige retirar antes.
- **Desativar não é porta de mão única**: o filtro *Disponibilidade → "Não vendidos nesta
  loja"* traz os desativados de volta, com o mesmo botão de editar para reativar.

`Produto.precoSugerido` é apenas a referência usada como padrão ao vincular o produto a uma
nova loja — nunca é o preço praticado. Sem campo próprio na tela, ele recebe o preço da
primeira loja que vende o produto.

### Campos sem UI nesta fase

Para manter o cadastro enxuto, ficaram **fora da tela** (mas continuam no modelo, porque há
regras que dependem deles): `pontoCompra`, `estoqueMaximoCentral`, `controleValidade`,
`validadePadraoDias`, `localizacaoPadrao` e `estoqueIdeal` da loja.

O formulário os mantém no estado e os reenvia intactos ao salvar — editar um produto **não**
zera o que não está visível. Produtos novos nascem com os padrões (`pontoCompra: 0`,
`controleValidade: 'nao-controlar'`), o que significa que:

- não entram no alerta de ruptura nem no indicador "estoque baixo" até que esses campos
  ganhem UI;
- não sugerem validade automática na tela de Compras.

A sugestão de abastecimento usa `estoqueIdeal`, que hoje só é semeado nos mocks — produtos
criados pela tela ficam com o padrão calculado em `garantirConfiguracao`.

### Login

`/login` fica **fora do AppShell** — sem sidebar nem header. Painel escuro da marca à
esquerda (some abaixo de `lg`) e o formulário à direita.

A autenticação é real: `RotaProtegida` confirma o token com a API antes de montar o shell, e
distingue **sem sessão** (vai para o login) de **API fora do ar** (mostra o erro e oferece
tentar de novo). O token fica no `localStorage`; a sessão, em memória, só depois de
confirmada.

### Vendas nesta fase

`Venda` é uma entidade própria (`vnd-*`), com itens, pagamento e linha do tempo. Duas telas:
**listagem** (`/vendas`) e **detalhe** (`/vendas/:id`), ambas construídas a partir das
referências `listagem-venda.png` e `detalhe-venda.png`.

Uma venda tem **N pagamentos**, cada um com ciclo de vida próprio (pendente, aprovado,
recusado, cancelado, estornado, expirado). A listagem mostra o pagamento principal — o
aprovado de maior valor — e um "+N" quando há outros; o detalhe lista todos. Os KPIs da
listagem respeitam os mesmos filtros da tabela.

### Totem de autoatendimento

`/totem` é a tela em que o **cliente** passa os produtos e paga sozinho. Vive fora do
`AppShell` como o login: sem menu, sem header, sem atalhos — quem está na frente dela não é o
operador. Exige sessão (o dispositivo entra com a conta da loja), mas **não ganha item na
sidebar** (regra 4): abre-se por Configurações → Autoatendimento, em aba própria, ou pela
URL.

Decisões que moldam a tela:

- **O catálogo da loja fica em memória.** `GET /loja` é chamado uma vez (e a cada volta ao
  início); o código de barras resolve localmente. Cada leitura precisa responder no
  instante, e uma ida à API por item seria o gargalo do caixa. Por isso a API da loja passou
  a devolver `ean` e `sku`.
- **O leitor é um teclado.** Manda o código e Enter. O campo de busca fica sempre focado
  para recebê-lo, e o cliente pode digitar o nome quando o produto não tem código. Na tela
  inicial, a primeira tecla já começa a compra — o caractere vira o começo da busca em vez de
  se perder.
- **A venda só é aberta quando o cliente escolhe a forma de pagamento.** Até ali o carrinho
  é memória da tela: desistir não deixa rastro no banco. Voltar ao carrinho depois de aberta
  cancela a venda (preços congelados nela) e uma nova nasce ao pagar.
- **Sem dinheiro.** Sem operador, não há quem dê troco: crédito, débito e Pix, todos pela
  maquininha. O balcão (`POST /vendas`) continua aceitando dinheiro.
- **Polling, não webhook.** A cada 1,5s o totem pergunta `GET /vendas/:id/pagamentos/:pid`;
  a API consulta o provedor e conclui a venda quando coberta. Dois minutos sem resposta
  abortam. Se a tela cair no meio, a conciliação do servidor termina o serviço.
- **O painel do simulador só existe com a maquininha simulada** (`VITE_PROVEDOR_PAGAMENTO`).
  É um bloco tracejado, âmbar, que diz o que é: "aproximar cartão" e "emissor recusa" fazem o
  que o cliente faria no terminal. Numa instalação real ele não aparece.
- Tudo é grande e para o dedo: alvos de 48px ou mais, nenhuma ação depende de hover,
  resultado volta ao início sozinho em 12s. Um botão discreto põe o navegador em tela cheia.

O estado é uma máquina em `useTotem`: `inicio → carrinho → pagamento → aguardando →
aprovado | recusado | falha`. `recusado` mantém a venda aberta para outra forma; `falha` é a
venda cancelada pelo sistema (aprovou mas faltou estoque — a API já estornou), e a tela diz
isso.

### Conceitos deliberadamente ausentes

Três coisas foram **removidas do domínio** (não apenas escondidas), porque não agregavam
nesta fase e cobravam complexidade em todas as telas:

- **Área de exposição** (prateleira / geladeira / freezer). A loja responde uma pergunta só:
  o produto está **disponível para venda** ou não. Não existem `AreaExposicao`, `areaId` no
  saldo nem mapa de exposição — a tela Loja é uma lista por produto, com os lotes somados.
- **Prioridade de abastecimento** (alta / média / baixa). O abastecimento é quantidade e
  destino; a urgência já está implícita no que está abaixo do mínimo.
- **Ajuste e perda como atalhos do Estoque central.** O ajuste continua existindo (clique na
  linha do lote, que é a granularidade correta) e a perda tem tela própria — os dois botões
  do topo escolhiam um lote arbitrário e foram removidos.

Na compra, apenas **fornecedor**, **datas** e **destino** são obrigatórios. Nota fiscal,
condição e forma de pagamento são opcionais; sem NF a movimentação registra apenas
"Compra registrada".

## Regras de negócio implementadas

Estas regras vivem nos Services e valem para toda a aplicação:

1. **Cadastrar produto não dá entrada em estoque.** O produto nasce com estoque `0` e
   `custoMedio: null`. Os campos "Estoque atual" e "Custo médio" existem no formulário, mas
   são somente leitura.
2. **Compra é a única entrada de estoque.** Confirmar uma compra: cria um lote por item,
   credita o saldo no local de destino, **recalcula o custo médio ponderado** do produto,
   gera a movimentação `ENTRADA` e persiste.
3. **Abastecimento é transferência.** Debita o estoque central (FEFO — lotes mais próximos
   do vencimento primeiro), credita a loja na área escolhida e gera `TRANSFERENCIA`.
   **O total global de estoque não muda** — o Service devolve `totalGlobalAntes` e
   `totalGlobalDepois` e a interface confirma isso no toast.
4. **Perda reduz o estoque** no local informado (também por FEFO), calcula o valor perdido a
   partir do custo dos lotes consumidos e gera `PERDA`.
5. **Ajuste** grava a diferença entre a contagem informada e o saldo atual como `AJUSTE`.
6. **Retirar da loja** devolve o item ao estoque central como `DEVOLUCAO`.
7. **Fornecedor novo não tem histórico** — "Produtos fornecidos" e "Últimas compras" são
   empty states no modo de criação.
8. **Preço e níveis de reposição são por loja.** Ativar um produto em uma loja exige
   preço maior que zero — a validação vive no Service, não só na tela.
9. **Notificações são derivadas, não armazenadas.** Cada uma nasce de um fato da operação
   (ruptura, vencimento em até 7 dias, sugestão de abastecimento, compra confirmada, perda
   registrada) e recebe um id determinístico. Só o estado "lida" é persistido — assim a
   notificação some sozinha quando o problema que a originou é resolvido.

## Atalhos de teclado

`useAtalhos` (em `src/lib/useAtalhos.ts`) registra os atalhos globais e ignora eventos
disparados dentro de campos de formulário:

- `⌘K` / `Ctrl+K` — focar a busca global
- `?` — abrir a lista de atalhos
- `Esc` — fechar painel, drawer ou diálogo
- `G` + tecla — navegação (`I` Início, `P` Painel, `D` Produtos, `F` Fornecedores,
  `C` Compras, `E` Estoque central, `A` Abastecimento, `M` Movimentações)

`ATALHOS_NAVEGACAO` é a fonte única: o diálogo de ajuda lê a mesma lista que o hook
registra, então a documentação na tela nunca fica dessincronizada do comportamento.

Fluxo verificado ponta a ponta (compra → estoque → abastecimento → perda → painel), com os
saldos conferidos em cada passo.

---

## Design System

Tokens em `tailwind.config.js` e `src/index.css` — **nenhuma página define cor própria**.

- **Cores**: `teal` (#087F73) para identidade e ação; `amber` (#F4A629) pontual; funcionais
  `success` / `warning` / `danger` / `info`; neutros `ink`, `bg`, `surface`, `line`, `muted`.
- **Tipografia**: Sora (títulos) + Inter (interface), escala fixa `caption` → `page-title`.
- **Radius**: 6 / 10 / 12 / 14 / 16 / full.
- **Sombras**: `shadow-card` quase imperceptível; cards são definidos pela borda de 1 px.
- **Espaçamento**: escala de 8 px; `gap-4` entre cards, `gap-6` entre blocos.

### Componentes compartilhados

`PageHeader` · `MetricCard` / `MetricGrid` · `SectionCard` / `CardFooterLink` ·
`DataTable` / `Pagination` · `Badge` / `StatusBadge` / `StatusDot` · `Button` / `LinkButton` ·
`FormField` / `Input` / `Select` / `Textarea` / `Toggle` / `SearchInput` / `FilterBar` ·
`Drawer` (+ `DrawerSection`, `DrawerLinha`, `DrawerEstatistica`, `QuickAction`) ·
`Dialog` / `ConfirmDialog` · `ToastProvider` / `useToast` · `EmptyState` · `Skeleton` ·
`ProgressBar` · `Alert` · `ProductAvatar` / `Avatar` / `Stepper` / `Chip` / `Contador`.

`StatusBadge` centraliza o mapeamento semântico de status e tipo de movimentação, para que
o mesmo estado tenha sempre a mesma cor em qualquer tela.

---

## Rotas

| Rota | Página |
|---|---|
| `/inicio` | guia de utilização + ações rápidas |
| `/painel-gerencial` | dashboard analítico |
| `/cadastros/produtos` · `/novo` · `/:id` | catálogo e formulário |
| `/cadastros/fornecedores` · `/novo` · `/:id` | listagem com drawer e formulário |
| `/operacao/compras` · `/nova` · `/:id` | compras e entrada de estoque |
| `/operacao/estoque-central` | estoque em nível de lote |
| `/operacao/abastecimento` | transferência central → loja |
| `/operacao/loja` | produtos expostos por área |
| `/operacao/movimentacoes` | histórico com drawer de detalhe |
| `/operacao/perdas-ajustes` | registro e histórico de perdas |
| `/login` | entrada no sistema (fora do App Shell) |
| `/vendas` · `/vendas/:id` | listagem de vendas e detalhe da venda |
| `/configuracoes` | preferências da operação |
| `/totem` | autoatendimento do cliente (fora do App Shell; exige sessão) |

`/` redireciona para `/inicio`; qualquer outra rota cai em `NaoEncontradaPage`.

---

## Estados de interface

- **Loading** — skeletons com a forma do conteúdo real (`SkeletonCard`, `SkeletonLinhas`,
  linhas de esqueleto na `DataTable`). Nenhum spinner central genérico.
- **Empty** — ícone + título + descrição + CTA, com texto diferente para "nada cadastrado"
  e "nada encontrado com estes filtros".
- **Erro** — `ErroDeNegocio` lançado no Service vira toast com a mensagem do domínio.
- **Destrutivo** — sempre passa por `ConfirmDialog`.

---

## Substituindo os mocks pela API real

A troca fica contida em duas peças:

1. **`src/services/api.ts`** — trocar `simular(fn)` por `fetch` (base URL, headers,
   tratamento de erro → `ErroDeNegocio`). `paginar()` passa a apenas ler a resposta.
2. **Cada Service** — substituir as manipulações do `dataStore` por chamadas HTTP,
   **mantendo as assinaturas atuais**.

Depois disso, `src/mocks/` e `src/services/datastore.ts` podem ser removidos.
Nenhum componente, hook, rota ou tipo precisa mudar: as páginas dependem apenas dos tipos em
`src/models` e das assinaturas dos Services.

As regras de negócio hoje no `DataStore` (custo médio, FEFO, movimentações) passam a ser
responsabilidade do backend — os `models` já descrevem exatamente esse contrato.
