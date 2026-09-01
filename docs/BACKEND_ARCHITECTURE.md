# Backend — arquitetura

**Estado:** o sistema inteiro é servido pela API. **Não há mais mock no frontend** — o
`dataStore` e a pasta `src/mocks` foram removidos.

| Camada | Escolha | Motivo |
|---|---|---|
| Runtime | Node 20 + TypeScript | mesma linguagem do frontend, tipos compartilhados via `packages/domain` |
| Framework | NestJS 10 | os módulos mapeiam 1:1 os Services que já existem no front |
| ORM | Prisma 5 | migrações versionadas e cliente tipado |
| Banco | PostgreSQL 16 | transação real e `numeric` para dinheiro |

---

## Por que Postgres, e não um banco de documentos

Confirmar uma compra grava **quatro coisas que precisam valer juntas**: o lote,
o saldo do local, o custo médio do produto e a movimentação `ENTRADA`. Se
qualquer uma falhar sozinha, o estoque diverge do histórico e nenhum número da
tela volta a ser confiável.

Isso é uma transação, e é o motivo da escolha. Sem ela, o mesmo trabalho vira
código de compensação manual — que só é exercitado quando já deu errado.

---

## Multi-tenant: `Empresa` é a raiz

Toda entidade de topo carrega `empresaId`, e **todo índice único de negócio é
composto com ele**:

```prisma
@@unique([empresaId, ean])
@@unique([empresaId, numero])
```

Duas empresas podem cadastrar o mesmo código de barras, ou ter uma compra
`COM-0001` cada. Sem o `empresaId` no índice, a segunda empresa a usar o sistema
esbarraria em conflitos causados por dados de outra.

Enxertar tenant depois é uma das migrações mais caras que existem: exige tocar
em toda tabela, todo índice e toda query ao mesmo tempo. Custa quase nada agora.

## Dinheiro e quantidade são `Decimal`

Nunca float. As escalas são deliberadas:

| Tipo | Escala | Por quê |
|---|---|---|
| Preços e totais | `Decimal(12–14, 2)` | valores em reais |
| Custos unitários | `Decimal(14, 4)` | custo médio ponderado gera dízima; arredondar a cada compra acumula erro |
| Quantidades | `Decimal(14, 3)` | kg e litro não são inteiros |

**Consequência no frontend:** hoje ele calcula em `number` puro. O Prisma
devolve `Decimal`, então a serialização da API precisa decidir entre string
(preciso) e number (cômodo). É um ajuste pequeno, mas real.

## Enums guardam a string do contrato

```prisma
enum StatusProduto {
  ATIVO   @map("ativo")
  INATIVO @map("inativo")
}
```

O banco grava `ativo`, exatamente o valor que o frontend já usa. Um `SELECT`
manual continua legível e o contrato da API não precisa traduzir nada.

## Correção herdada do modelo do frontend

`Loja` e `LocalEstoque` apontavam um para o outro (`Loja.localId` e
`LocalEstoque.lojaId`). Em memória isso passa; em SQL vira dependência circular
de chave estrangeira, e nenhum dos dois pode ser inserido primeiro.

**Só o local referencia a loja.** O `localId` da loja é derivado na resposta da
API, e o contrato do frontend fica igual.

## `ean`, `sku` e cliente: únicos quando preenchidos

No Postgres, vários `NULL` convivem no mesmo índice único. Então:

- produto sem código de barras não colide com outro sem código de barras;
- **cliente não tem nenhum campo obrigatório**, mas documento e telefone são
  únicos quando informados.

Isso entrega o "cliente simples agora, fidelidade depois" sem deixar a tabela
virar um depósito de duplicatas — deduplicar depois seria migração de dados, não
de schema.

## Histórico é imutável

`MovimentacaoEstoque` guarda `origemLabel` e `destinoLabel` como **texto
congelado**, além das chaves estrangeiras. `ItemVenda` congela nome, EAN e preço.

Renomear uma loja ou reajustar um preço não pode reescrever o passado. A FK
serve para navegar; o texto serve para contar o que aconteceu.

---

## Autenticação

```
POST /api/auth/login   { email, senha }  ->  { token, usuario }
GET  /api/auth/eu                        ->  { usuario, empresa, lojas }
```

JWT assinado com `JWT_SECRET`, validade `JWT_EXPIRA_EM` (padrão 12h — uma jornada).
Senhas em bcrypt. **Sem refresh token ainda**: quando o prazo vence, o usuário
faz login de novo.

### Nega por padrão

O `JwtGuard` é registrado como `APP_GUARD` — vale para **toda** rota. Quem quiser
ficar aberto declara `@Publico()` (hoje: login e health).

A inversão é deliberada. Esquecer de proteger um endpoint deixaria dado exposto
em silêncio; esquecer de marcar um como público quebra na primeira chamada,
bem visível.

### O tenant vem do token, nunca do cliente

O JWT carrega `empresaId`. O guard o anexa à requisição e o decorator
`@EmpresaAtual()` o entrega ao controller, que passa adiante como **parâmetro
obrigatório** dos Services.

Não é convenção: é impossível chamar o método sem informar de qual empresa se
trata. Se o `empresaId` viesse no corpo ou na query, qualquer cliente poderia
pedir os dados de outra.

### Resposta única para falha de login

E-mail inexistente, senha errada e usuário inativo devolvem exatamente a mesma
mensagem. Qualquer diferença — inclusive só marcar o campo do e-mail na tela —
vira um oráculo para descobrir quais contas existem.

---

## Frontend conectado

- `services/http.ts` — `fetch` com base URL, `Authorization` e tradução do erro
  do Nest (`message` pode ser string ou array).
- `services/auth.service.ts` — login, logout e sessão. Guarda o token no
  `localStorage`; **componente nenhum toca nisso**.
- `app/RotaProtegida.tsx` — confirma o token com a API antes de montar o shell.

Três detalhes que mudam o comportamento:

1. **Token guardado não é sessão válida.** O porteiro chama `/auth/eu` antes de
   liberar; token expirado é descartado e vira redirecionamento ao login.
2. **API fora do ar não desloga.** O porteiro distingue *sem sessão* de *API
   inacessível* — no segundo caso mostra o erro e oferece tentar de novo.
   Mandar para o login faria o usuário digitar a senha à toa.
3. **A rota pretendida é preservada.** Quem é barrado em `/cadastros/produtos`
   volta para lá depois de entrar, não para o início.

O que já vem da API: **identidade** (nome, iniciais, função, e-mail) e a empresa.
Todo o resto — produtos, estoque, vendas — continua em mock. É por isso que a
lista de lojas do menu ainda é a do mock: ela migra junto com o módulo de lojas,
para não misturar loja real com dado fictício.

---

## Produtos — a primeira fatia vertical

```
GET   /api/produtos                                Paginado<ProdutoListItem>
GET   /api/produtos/resumo                         KPIs do catálogo
GET   /api/produtos/simples                        lista enxuta (compras, perdas, movimentações)
GET   /api/produtos/configuracoes-loja             padrão por loja (cadastro novo)
GET   /api/produtos/:id
GET   /api/produtos/:id/configuracoes-loja
POST  /api/produtos
PATCH /api/produtos/:id
PATCH /api/produtos/:id/status
PUT   /api/produtos/:id/configuracoes-loja/:lojaId
GET   /api/categorias · GET /api/marcas            somente leitura nesta fase
```

### O frontend não mudou

Só `produto.service.ts` foi reescrito: `simular()` virou `requisitar()`. As **8 páginas**
que dependem dele — Produtos, Formulário, Nova compra, Detalhe da compra, Movimentações,
Perdas, Fornecedores e Loja — não foram tocadas.

Erros 409 (regra de negócio) e 400 (validação) viram `ErroDeNegocio`, que é o que as telas
já sabiam tratar.

### Busca com acento

O `ILIKE` do Postgres compara bytes: `'%acucar%'` não encontra "Açúcar". O `mode:
'insensitive'` do Prisma resolve maiúsculas, não diacríticos.

A solução foi a coluna **`produto.busca_texto`** — nome, EAN e SKU normalizados, mantidos
pelo serviço em um único ponto. Sem extensão do banco, indexável, e replica exatamente o
`contem()` que o frontend fazia em memória. É o tipo de detalhe que regride em silêncio se
passar batido.

### Agregados sem N+1

`estoqueTotal`, `estoqueBaixo`, `precoNaLoja`, `precosVariam` e `lojasAtivas` derivam de
somas em `saldo_estoque` e `configuracao_produto_loja`. São resolvidos com **dois
`groupBy`**, nunca uma consulta por produto.

**Limite conhecido:** filtrar por `estoque` e ordenar por estoque/preço acontece em memória,
sobre o conjunto já filtrado por SQL, com teto de 5.000 produtos (`TETO_AGREGADOS`). Para um
minimercado é folgado; quando o catálogo crescer, vira consulta SQL com agregação. O teto é
explícito para não virar surpresa.

### Seed: os mocks viraram dados reais

`prisma/seed/` porta a geração dos mocks — 40 produtos, 7 compras, 40 lotes, 67 saldos,
83 movimentações e 7 perdas, com os mesmos números do frontend (central 3.101, loja 603).

Duas diferenças deliberadas:

1. **Os IDs do mock são preservados** (`cat-bebidas`, `prd-001`, `loja-001`). Enquanto os
   outros módulos ainda leem mocks, os dois lados precisam falar a mesma língua — senão uma
   compra apontaria para produtos que o `dataStore` não conhece.
2. **As datas são ancoradas no momento do seed**, não em 2026-08-31. "Sem giro há 30 dias" e
   "próximos vencimentos" perderiam o sentido com a base parada no tempo.

E uma correção: no mock, `prd-016` e `prd-018` compartilhavam o EAN `7896023900123`. Em
memória ninguém percebia; o índice único do banco rejeitou. Código de barras identifica o
produto — o iogurte recebeu EAN próprio.

O seed **recria a base do zero**. É de demonstração, e é o que "Restaurar dados" significa.

---

## Fornecedores

```
GET   /api/fornecedores                 Paginado<FornecedorListItem>
GET   /api/fornecedores/resumo          KPIs
GET   /api/fornecedores/simples         só os ativos (compras)
GET   /api/fornecedores/:id
GET   /api/fornecedores/:id/produtos    produtos fornecidos
GET   /api/fornecedores/:id/compras     últimas compras
POST  /api/fornecedores
PATCH /api/fornecedores/:id
PATCH /api/fornecedores/:id/status
```

Mesmo padrão de Produtos: só `fornecedor.service.ts` mudou no frontend; as 4 páginas que
dependem dele não foram tocadas.

### Colunas planas, contrato aninhado

O contrato tem `contato`, `endereco` e `comercial` como objetos; o banco guarda colunas
planas (`contato_nome`, `endereco_cidade`, …). Colunas explícitas são consultáveis e
indexáveis — um `Json` não seria.

O ponto de atenção é o **update parcial**: o contrato aceita `Partial<EntradaFornecedor>`, e
um campo ausente não pode zerar a coluna. O serviço lê o registro atual e preenche as lacunas
antes de gravar. Está coberto por teste: alterar só o nome preserva contato, endereço e
condições comerciais.

### Só o nome é obrigatório

Documento, categoria, contato, telefone, endereço e condições comerciais deixaram de ser
exigidos. Nenhum deles participa de regra de negócio: a condição de pagamento do fornecedor
não alimenta a Nova Compra (aquela tela tem estado próprio), o prazo de entrega é exibição, e
o documento só aparece na listagem.

É a mesma regra definida para Cliente, pelo mesmo motivo: cadastro não pode travar o fluxo.
Exigir CNPJ impedia registrar o padeiro do bairro.

O que **não** mudou: documento e categoria continuam sendo validados **quando informados** —
unicidade e existência. Aceitar o campo vazio é diferente de aceitar lixo.

Dois detalhes que isso obrigou:

- **Documento vazio grava `NULL`, nunca `''`.** O índice é `@@unique([empresaId, documento])`;
  duas strings vazias colidiriam e o erro seria incompreensível. Vários `NULL` convivem.
  Coberto por teste: dois fornecedores sem documento são aceitos.
- **Fallbacks de exibição.** Sem eles a listagem mostrava célula vazia e o drawer exibia
  "0 dias" como se fosse um prazo real de entrega imediata.

### Empty states continuam sendo regra

`/produtos` e `/compras` de um fornecedor recém-criado devolvem `[]` — nunca dado de outro
fornecedor nem exemplo fictício. É a regra do documento original, agora garantida pela API.

### Busca

Mesma solução de Produtos: coluna `fornecedor.busca_texto` com nome, fantasia, documento e
contato normalizados. "sao jose" encontra "Padaria São José"; "fonseca" encontra o contato
"Marina Fonsêca".

---

## Estrutura

```
apps/api/
  prisma/
    schema.prisma       21 tabelas, 48 chaves estrangeiras
    seed/               porte dos mocks: catálogo, compras, lotes, saldos, movimentações
  src/
    main.ts             prefixo /api, CORS, ValidationPipe, shutdown hooks
    app.module.ts
    prisma/             PrismaService global
    auth/               login, JwtGuard global, decorators de sessão/empresa
    produtos/           catálogo: produtos + CRUD de categorias e marcas
    fornecedores/       fornecedores, produtos fornecidos e histórico de compras
    compras/            confirmação de compra — a única entrada de estoque
    estoque/            núcleo transacional, abastecimento, perdas, ajustes, histórico
    loja/               prateleira: disponibilidade e devolução ao central
    vendas/             histórico de vendas (somente leitura)
    painel/             Início, Painel gerencial e notificações derivadas
    comum/              normalização de texto e conversão de Decimal
    health/             liveness e readiness
```

### Health check

- `GET /api/health` — liveness. Não toca no banco de propósito.
- `GET /api/health/ready` — readiness. Faz `SELECT 1`; devolve **503** com o
  motivo quando o banco não responde.

A API **sobe mesmo sem banco** e diz que não está pronta, em vez de morrer no
start deixando o motivo só no log. É o que um balanceador precisa para parar de
mandar tráfego.

---

## Rodando

Esta máquina já tem um **Postgres nativo na 5432** (serviço do Windows), então o
`docker-compose` publica a **5433** para não conflitar. Escolha um dos dois no
`apps/api/.env` — o `.env.example` traz as duas URLs prontas.

```bash
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev:api
```

Login do seed: `admin@mercalya.com.br` / `mercalya`.

---

## Núcleo transacional

As quatro operações que **movem mercadoria**. Todas passam pelas mesmas primitivas em
`estoque/nucleo.service.ts`, e todas rodam dentro de uma transação.

| Operação | O que grava | Efeito no total da empresa |
|---|---|---|
| **Confirmar compra** | lote + saldo + custo médio + `ENTRADA` | **aumenta** |
| **Abastecer** | consumo FEFO no central + saldo na loja + `TRANSFERENCIA` | **não muda** |
| **Registrar perda** | consumo FEFO + registro de perda + `PERDA` | **diminui** |
| **Ajustar saldo** | novo saldo + `AJUSTE` | varia pelo delta |

### Por que `tx` é o primeiro parâmetro de tudo

Toda função do núcleo recebe o cliente de transação, nunca o `PrismaService` global. Não é
estilo: é o que impede uma escrita escapar do commit. Aceitar o Prisma global ali abriria a
porta para exatamente o defeito que o Postgres foi escolhido para evitar.

**Verificado empiricamente.** Uma compra com dois itens, onde o segundo estoura o
`Decimal(14,3)` no meio do laço: o primeiro item já tinha gravado compra, lote, saldo, custo
médio e movimentação. Depois da falha, tudo voltou ao estado anterior — contagem de compras,
saldo e custo médio idênticos, nenhuma linha órfã.

### Custo médio em `Decimal`

A média ponderada é calculada com `Prisma.Decimal`, não com float: a divisão gera dízima e
arredondar a cada compra acumula erro que aparece no valor do estoque.

Comprovado: 322 un a R$ 1,70 + 100 un a R$ 2,00 devolveu **R$ 1,7711** — exatamente
`(322×1,70 + 100×2,00) ÷ 422`.

Sem saldo nenhum, o custo da última entrada é mantido como referência. Zerar faria a margem
do próximo produto vendido parecer 100%.

### FEFO, e por que os lotes consumidos são devolvidos

`consumirFefo` devolve quais lotes saíram porque quem chama precisa deles: a transferência
recria o saldo **lote a lote** no destino — perder esse vínculo destruiria o controle de
validade na prateleira — e a perda calcula o valor pelo custo de cada lote consumido.

Saldo sem lote sai por último: mercadoria com validade conhecida deve girar antes.

### Saldo nunca fica negativo

`aplicarSaldo` trunca em zero. Estoque negativo silencioso contamina custo médio, valor de
estoque e sugestão de abastecimento de uma vez — todos os outros números perdem confiança
juntos.

### Numeração sem colisão

`proximoNumero` faz `increment` no banco, dentro da transação. Dois usuários confirmando
compras ao mesmo tempo não recebem o mesmo número: o segundo espera o lock da linha.

### Erros do Prisma viram resposta com significado

Um `PrismaExcecaoFilter` global traduz violação de índice único (409), chave estrangeira
(409), registro ausente (404) e valor fora de faixa (400). Sem ele, o cliente recebia
"Internal server error" e ninguém sabia o que fazer.

---

## Loja

```
GET  /api/loja              produtos disponíveis para venda
GET  /api/loja/resumo       KPIs da prateleira
POST /api/loja/retirar      devolve mercadoria ao central
```

### Havia uma escrita indo para lugar nenhum

Até esta migração, `retirarDaLoja` consumia FEFO, registrava movimentação e persistia — tudo
no `dataStore` do navegador. A tela mostrava sucesso e **o banco nunca ficava sabendo**.

Pior que dado velho: era uma operação que parecia funcionar e sumia no próximo "Restaurar
dados". E como o Estoque central já lia do banco, as duas telas passavam a discordar sobre a
mesma mercadoria.

Agora é uma transação como qualquer outra. **Retirar é devolver ao central, não descartar**:
a mercadoria continua existindo, o total da empresa não muda, e a movimentação é
`DEVOLUCAO` — o espelho exato do abastecimento. Consome por FEFO, porque o que está mais
perto de vencer é o que deve voltar primeiro.

Verificado pela interface: 4 un retiradas, `DEVOLUCAO` gravada, total global 3.799 antes e
depois.

### Delta que não dá para medir vem ausente, não zerado

O mock devolvia `itensExpostosDelta: 3.2`, `valorPotencialDelta: 8.4` e
`estoqueBaixoDelta: 12.1` — números fixos, inventados.

A primeira versão desta migração trocou os três por `0`. Era o mesmo defeito com outra
roupa: o `MetricCard` desenha a linha sempre que o campo existe, então "0,0% vs ontem"
**afirma estabilidade onde não houve medição**.

Os campos agora são opcionais. `itensExpostosDelta` é reconstruído das movimentações do
período — saldo de hoje menos o líquido dos últimos 30 dias — e vem ausente quando não há
saldo anterior para comparar. Os outros dois exigiriam histórico de preços e de mínimos, que
não são guardados, e por isso simplesmente não são enviados.

O card omite a linha. É menos informação na tela, e nenhuma informação falsa.

---

## Vendas

```
GET /api/vendas               histórico paginado
GET /api/vendas/resumo        KPIs do período
GET /api/vendas/lojas
GET /api/vendas/:id           aceita id ou número
GET /api/vendas/:id/historico linha do tempo
```

Somente leitura: o PDV que registra venda em tempo real ainda não existe.

### As 94 vendas debitam estoque

A decisão pendente desde o começo foi resolvida: o histórico **consome a prateleira**, em
ordem cronológica e por FEFO. Venda cancelada não consome — foi registrada e desfeita.

O resultado é que a identidade contábil fecha:

```
entradas 4.560 − perdas 22 − vendas 682 = 3.856 em estoque
```

Transferências e devoluções se anulam no total, porque movem entre locais sem criar nem
destruir.

### A compra passou a cobrir o giro

Portar as vendas expôs um furo no seed: produtos como o Pão Francês eram comprados em 18
unidades e vendidos em mais que isso. A primeira execução acusou **6 itens sem saldo** — e
acusou em vez de truncar em silêncio, que era o ponto de ter o contador.

A correção foi mover a geração das vendas para **antes** das compras, e somar o giro do
período à quantidade comprada. Comprar menos do que se vende deixaria a prateleira negativa
e o histórico não fecharia.

Pela mesma razão as transferências passaram a cobrir o que seria vendido: a primeira
transferência é de 16 dias atrás, e há vendas de 29 dias atrás — sem isso a loja estaria
vazia quando a venda mais antiga aconteceu.

### Delta calculável, ao contrário da Loja

Aqui a variação **é** medição: compara o período consultado com o imediatamente anterior de
mesma duração. Vendas têm data e valor; não há estimativa envolvida.

Mas o mesmo critério da Loja vale — **sem período anterior, o campo vem ausente**. Como o
histórico cobre só os últimos 30 dias, hoje todos os deltas estão ausentes e os cards não
desenham a linha. Quando houver dois meses de venda, eles aparecem sozinhos.

---

## Categorias e marcas

```
GET    /api/categorias        ·  GET /api/categorias/uso
POST   /api/categorias        ·  PATCH /api/categorias/:id  ·  DELETE /api/categorias/:id
GET    /api/marcas            ·  GET /api/marcas/uso
POST   /api/marcas            ·  PATCH /api/marcas/:id      ·  DELETE /api/marcas/:id
```

### Era um bloqueio de adoção, não um buraco cosmético

Criar uma conta vazia expôs o problema em cinco minutos: categoria é obrigatória no produto,
não havia tela para criar a primeira, e **o cliente novo travava no primeiro cadastro**. O
select vinha só com o placeholder.

O contraste com fornecedores foi o que deixou claro — lá a categoria virou opcional, e a
conta nova conseguiu cadastrar o primeiro fornecedor sem esbarrar em nada.

### Onde a tela vive

O sidebar é canônico (regra 4 da especificação) e não ganha item novo. Então:

- **Criar** acontece no próprio formulário de produto, por um "+ Nova" ao lado do select.
  É onde a falta dói, e obrigar o usuário a abandonar um cadastro pela metade seria pior.
  Ao criar, a lista recarrega e o item já vem selecionado.
- **Renomear e excluir** ficam em Configurações, com a contagem de uso ao lado de cada item.
  É manutenção ocasional, não operação diária.

### Exclusão informa o que impede

O banco já barra por chave estrangeira, mas o erro cru não diz nada. A API responde
`"Bebidas" está em 1 produto. Troque a categoria deles antes de excluir.` — o usuário sabe
o que precisa mudar.

Marca merece atenção especial: a FK é `SetNull`, então o banco **aceitaria** a exclusão e
desvincularia os produtos em silêncio. Apagar uma marca não deveria alterar produto nenhum
sem o usuário saber, então o serviço bloqueia antes.

Nomes duplicados são recusados sem diferenciar maiúsculas — "Bebidas" e "bebidas" são a
mesma categoria para quem lê a lista.

---

## Painel, Início e Notificações

```
GET  /api/inicio/resumo   ·  GET /api/inicio/dicas
GET  /api/painel          ·  GET /api/painel/lojas
GET  /api/notificacoes    ·  POST /api/notificacoes/lidas[/todas]
```

### O vazamento que motivou a pressa

Estes três liam o `dataStore` do `localStorage` — que pertence ao **navegador**, não à
conta. Logada numa empresa vazia, a tela de Início mostrava "40 produtos" e "R$ 1.073,58"
da outra. O mesmo valia para `AppSession`, que enchia o card "Loja e condomínio" com a loja
alheia.

Não era divergência estética: era dado de outro cliente na tela.

### O Painel deixou de ser maquete

O que existia antes, e o que existe agora:

| Antes | Agora |
|---|---|
| Evolução de vendas: `Math.sin(i/2.2)` | série real por dia, somada das vendas |
| Compras × vendas: fatores `[0.9, 1.08, …]` | valores reais por semana |
| Distribuição por categoria: peso do **estoque parado** | por **venda realizada** |
| 8 deltas constantes (18,4%, 21,1%…) | comparação com o período anterior |
| Faturamento: projeção sobre 6 movimentos | soma das vendas do período |
| Meta R$ 3.500, 87 clientes, 2,3% devoluções | medidos, ou ausentes |

O custo da venda vem da **movimentação**, que carrega o custo do lote que efetivamente saiu
— não o custo médio de hoje. É o que faz a margem de 29,9% ser um número e não uma
estimativa.

### Ausente é diferente de zero

`metaVendas` não é enviada: não existe meta cadastrada no sistema, e a tela não desenha
barra de progresso contra um alvo que ninguém definiu. Os deltas sem período anterior também
vêm ausentes, e o card escreve "sem comparação".

Tornar esses campos opcionais no `packages/domain` fez o TypeScript apontar **sete pontos**
do Painel que dividiriam por `undefined` e renderizariam `NaN`. Nenhum deles era visível
antes de o tipo mudar.

### Notificação lida é por usuário

Notificações continuam **derivadas de fatos** — ruptura, vencimento, compra, perda — e não
são armazenadas. Só a marca de "lida" persiste, agora numa tabela por **usuário**: antes
ficava no `localStorage`, o que significava que pertencia ao navegador, não à pessoa.

### "Restaurar dados de demonstração" foi removido

O botão limpava o `localStorage`. Com os dados no Postgres ele já não fazia nada — só não
parecia quebrado. Um botão que não faz nada é pior que nenhum botão; quem administra usa o
seed pela linha de comando.

O card de Configurações que dizia "Não há backend, tudo é persistido no navegador" também
foi corrigido: era falso.

---

## Fim dos mocks

`src/mocks/` e `services/datastore.ts` foram removidos — 1.302 linhas de código morto. De
`api.ts` sobrou apenas `ErroDeNegocio`; `simular()`, `paginar()` e `contem()` não tinham
mais chamador.

O frontend tem **um único caminho de dados**: `http.ts`. O que ainda vive no navegador é o
token da sessão, e só o AuthService o toca.

---


## O que falta

Todo o sistema é servido pela API. O que resta são funcionalidades novas, não migração:

1. **PDV** — registrar venda em tempo real. O histórico já debita estoque; falta a escrita.
2. **Cancelamento de compra e devolução ao fornecedor** — o inverso da entrada, com o mesmo
   cuidado transacional.
3. **Contas a pagar** — o vencimento da compra já é gravado e ainda não vira nada.
4. **Meta de vendas** — hoje o Painel omite a barra de progresso porque não há meta
   cadastrada em lugar nenhum.
5. **Seletor de loja** — o modelo suporta N lojas por empresa, mas a interface sempre usa a
   primeira.
