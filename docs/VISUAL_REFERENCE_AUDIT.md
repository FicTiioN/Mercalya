# Mercalya — Auditoria de Referências Visuais

Auditoria realizada sobre as **15 referências** em `/references` antes de qualquer linha de código de tela. Cada imagem foi aberta e analisada individualmente e depois comparada com o conjunto.

## Inventário das referências

| # | Arquivo | Tela | Geração |
|---|---------|------|---------|
| 1 | `17_36_26 (1).png` | **Início** | mais recente |
| 2 | `17_36_26 (2).png` | **Painel gerencial** | mais recente |
| 3 | `17_36_10 (1).png` | Produtos (listagem) | atualizada |
| 4 | `17_36_10 (2).png` | Cadastrar produto | atualizada |
| 5 | `17_36_10 (3).png` | Fornecedores (listagem + drawer) | atualizada |
| 6 | `17_36_10 (4).png` | Cadastrar fornecedor | atualizada |
| 7 | `17_36_10 (5).png` | Nova compra (stepper) | atualizada |
| 8 | `17_36_10 (6).png` | Estoque central | atualizada |
| 9 | `17_36_10 (7).png` | Abastecer mercado | atualizada |
| 10 | `17_36_10 (8).png` | Produtos na loja | atualizada |
| 11 | `17_36_10 (9).png` | Movimentações (+ drawer) | atualizada |
| 12 | `17_36_10 (10).png` | Perdas e ajustes | atualizada |
| 13 | `listagem-venda.png` | **Vendas — listagem** | posterior |
| 14 | `detalhe-venda.png` | **Vendas — detalhe** | posterior |
| 15 | (referência de login) | **Login** | posterior |

As imagens 1 e 2 (`17_36_26`) definem o **App Shell canônico** (PRIORIDADE 2). As demais definem conteúdo e composição de cada página (PRIORIDADE 3).

---

## App Shell

Todas as 12 referências compartilham exatamente o mesmo shell — esse é o padrão mais consistente do conjunto inteiro.

- **Sidebar**: fixa à esquerda, fundo `#FFFFFF`, borda direita 1px `#E3E8EA`. Largura medida aprox. **220 px** sobre um viewport de ~1440 px (15,2 %). Adotado: **224 px**.
- **Header**: fixo no topo da área de conteúdo (começa depois da sidebar, **não** atravessa a tela toda). Altura medida aprox. **76–82 px**. Adotado: **76 px**. Fundo branco, borda inferior 1px.
- **Content**: fundo `#F7F9FA`; padding horizontal aprox. **32 px**, padding superior aprox. **32 px**. Largura do conteúdo não travada — ocupa a largura disponível.
- **Drawer contextual**: em Fornecedores e Movimentações o drawer é uma **coluna fixa à direita** dentro do content (aprox. 300–340 px), não um overlay modal. Em telas menores vira overlay.

### Sidebar — anatomia (de cima para baixo)

1. Bloco de marca: ícone "M" (teal + amber), wordmark **Mercalya** em Sora bold ~30px, tagline `GESTÃO INTELIGENTE / PARA O NOVO VAREJO.` em 9–10px, uppercase, letter-spacing largo, cor teal.
2. Divisor 1px.
3. Navegação (rola internamente se necessário).

As referências trazem, no rodapé da sidebar, um card de condomínio e um card de usuário.
**Ambos foram removidos por decisão do produto** (ver divergência 11): o usuário já aparece
no header e a troca de condomínio não faz parte deste escopo. A sidebar termina na navegação.

A sidebar é **`position: fixed`** — permanece visível enquanto o conteúdo rola. O conteúdo é
deslocado por `padding-left: 224px` a partir de `lg`; abaixo disso ela vira drawer.

Item de nav **ativo**: fundo teal claro (`#E8F3F1`), texto e ícone teal `#087F73`, peso 600, radius 10, com borda sutil. Item normal: texto ink/secundário, ícone outline. Subitem ativo: fundo teal muito claro + marcador à esquerda.

### Header — anatomia

`[ busca global (~480px, radius 10, ícone lupa, badge ⌘K à direita) ] ... [ sino + badge amber ] [ ? ] [ avatar JS ] [ João Silva / Administrador ] [ chevron ]`

O sino abre o **painel de notificações** e o `?` abre o **menu de ajuda** — ambos
especificados na seção "Header — notificações e ajuda" mais adiante.

---

## Design Tokens

### Cores (Design System oficial — PRIORIDADE 1)

| Token | Hex |
|---|---|
| `teal` (primária) | `#087F73` |
| `teal-dark` | `#066A61` |
| `amber` | `#F4A629` |
| `ink` | `#17232D` |
| `bg` | `#F7F9FA` |
| `surface` | `#FFFFFF` |
| `surface-2` | `#F1F4F5` |
| `border` | `#E3E8EA` |
| `text-secondary` | `#65747E` |
| `success` | `#18A66A` |
| `warning` | `#F5A623` |
| `error` | `#E5484D` |
| `info` | `#3979E9` |

Uso observado: o **teal** é a cor de ação/identidade (botões primários, itens ativos, links, valores positivos). O **amber** aparece com parcimônia: badge de notificação, estado "Em andamento", CTA de destaque ("Ver estoque"), badge "Atenção", prioridade "Média". Vermelho só em perda/erro/crítico. Azul só em informação. **Nenhuma referência usa gradiente ou cor de fundo saturada em área grande.**

### Radius

`6` (badge pequeno/checkbox) · `10` (input, botão, item de nav) · `12` (card interno, container de ícone) · `14` (card padrão / tabela) · `16` (container grande) · `full` (pill badges).

### Sombras

Extremamente discretas. Cards são definidos por **borda 1px**, não por sombra. Adotado: `shadow-card` = `0 1px 2px rgba(23,35,45,0.04)`; `shadow-pop` (drawer/dropdown) = `0 8px 24px rgba(23,35,45,0.08)`. Nenhum glassmorphism/neumorphism.

### Espaçamento

Escala 4/8/16/24/32/40/48/64/80. Gap entre cards de grid: **16 px**. Gap entre blocos verticais da página: **24 px**. Padding interno de card: **20–24 px**.

### Tipografia

Títulos: **Sora**. Interface: **Inter**. Fallback: system-ui.

| Papel | Tamanho | Peso | Família |
|---|---|---|---|
| Page title | 34px | 700 | Sora |
| Section title | 18px | 600 | Sora |
| Card title | 15–16px | 600 | Sora |
| KPI value | 26–28px | 600 | Sora |
| Body | 14px | 400 | Inter |
| Label | 13px | 500 | Inter |
| Caption / helper | 12px | 400 | Inter |
| Table header | 12.5px | 500 | Inter |

### Ícones

Uma única biblioteca outline, traço 1.75–2px, cantos arredondados: **lucide-react**. Tamanho padrão 18–20px na nav e ações, 20–22px dentro de containers de KPI.

---

## Componentes identificados (recorrentes em três ou mais referências)

| Componente | Onde aparece |
|---|---|
| `AppShell` / `AppSidebar` / `AppHeader` | todas |
| `PageHeader` (título + subtítulo + ações à direita) | todas as páginas |
| `MetricCard` (ícone tintado + label + valor + delta) | Produtos, Fornecedores, Estoque, Loja, Perdas, Movimentações, Início |
| `KpiStrip` (faixa única dividida por separadores) | Painel gerencial |
| `SectionCard` (card branco com título e corpo) | todas |
| `FilterBar` (labels acima, inputs 40–44px, botão Filtros) | Produtos, Fornecedores, Estoque, Loja, Movimentações, Perdas |
| `DataTable` + `Pagination` | 8 referências |
| `StatusBadge` (pill tintado) | todas as tabelas |
| `Drawer` (coluna direita com header/seções/ações rápidas) | Fornecedores, Movimentações |
| `EmptyState` | derivado do padrão de cards |
| `Skeleton` | derivado |
| `QuickAction` (linha bordeada com ícone + label + chevron) | Início, Loja, Fornecedores |
| `ProductAvatar` (thumb 36–40px, radius 8, fundo neutro) | Produtos, Estoque, Abastecimento, Compras |
| `Stepper` | Nova compra |
| `FormField` (label + required + input + helper) | Cadastros |
| `Toast` / `ConfirmDialog` | inferido do Design System |

---

## Navegação (estrutura final adotada)

Conflito encontrado: as referências mostram sidebars com composições **diferentes** de subitens (`Categorias`, `Marcas`, `Clientes`, `Funcionários`, `Unidades de medida`, `Transferências`, `Devoluções`, `Produção`, `Inventário`, `Conferência`, `Estoque`, `Loja`, `Perdas`). Essas variações são inconsistências entre imagens.

**Resolução:** prevalece a estrutura canônica do documento de requisitos (regras 4 e 48):

```
Início                      -> rota direta
Painel gerencial            -> rota direta
Cadastros                   -> accordion
    Produtos
    Fornecedores
Operação                    -> accordion
    Compras
    Estoque central
    Abastecimento
    Loja
    Movimentações
    Perdas e ajustes
Vendas                      -> rota direta
Configurações               -> rota direta
```

Comportamento dos accordions: fechados por padrão; abre automaticamente o grupo da rota atual; abrir um grupo fecha o outro (somente um grupo expandido por vez); grupo pai destacado quando contém a rota ativa; subitem ativo com marcador.

---

## Padrões de página

**Listagem** (Produtos, Fornecedores, Movimentações, Perdas)
`PageHeader` -> linha de `MetricCard` (4 colunas) -> `FilterBar` -> `DataTable` em card -> `Pagination`.

**Cadastro** (Produto, Fornecedor)
Grid 2 colunas: coluna principal com `SectionCard`s empilhados (Informações principais / Preço / Estoque / Identificação) + coluna lateral contextual (Dicas, Prévia, Produtos fornecidos, Últimas compras). Barra de ações no rodapé: `Cancelar` (ghost) — `Salvar e ...` (outline) — `Salvar ...` (primário teal).

**Dashboard** (Painel gerencial)
Filtros no canto superior direito do header -> `KpiStrip` de 8 KPIs -> 3 cards de gráfico -> 3 cards de listas -> 3 cards de listas/resumo.

**Operação** (Estoque central, Abastecimento, Loja)
Conteúdo principal 2/3 + coluna auxiliar 1/3 (sugestões, mapa de exposição, resumo). Abastecimento usa layout de duas caixas: disponíveis à esquerda, selecionados à direita.

**Drawer lateral** (Fornecedores, Movimentações)
Header (título + badge de status + `X`) -> seções com título 13px semibold -> linhas `ícone + label pequeno / valor` -> bloco de estatísticas em pares label/valor -> `Ações rápidas` como lista de botões bordeados, último em vermelho quando destrutivo.

---

## Divergências encontradas e decisões

| # | Divergência | Decisão |
|---|---|---|
| 1 | Sidebars com subitens diferentes entre imagens | Adotada a estrutura canônica da regra 4. Subitens extras descartados. |
| 2 | Título "Abastecer mercado" (img 9) vs item de menu "Abastecimento" | Menu = `Abastecimento`; título da página = **Abastecer loja**, consistente com o passo 5 do Início. |
| 3 | Cadastrar produto (img 4) exibe campo **Estoque atual** editável | **Regra de negócio prevalece (regra 23):** o campo existe mas é read-only, fixo em `0`, com helper "O estoque entra pela tela de Compras". |
| 4 | Cadastrar produto (img 4) exibe **Custo médio** como campo obrigatório editável | Read-only: "Custo ainda não calculado." O custo médio nasce das compras. |
| 5 | Cadastrar fornecedor (img 6) mostra "Produtos fornecidos" e "Últimas compras" preenchidos num formulário de **novo** fornecedor | **Empty state** no modo `new`; dados reais só no modo edição (regra 25). |
| 6 | Painel gerencial usa faixa única de KPIs; demais páginas usam cards separados | Ambos mantidos como componentes distintos (`KpiStrip` vs `MetricCard`) — é uma diferença deliberada de densidade, não uma inconsistência. |
| 7 | Estoque central (img 8) mostra coluna "Reserva" | Mantida, alimentada pelo modelo de lote. |
| 8 | Abastecimento (img 9) sugere que a operação "cria" estoque na loja | **Regra 29 prevalece:** é transferência; o total global não muda. |
| 9 | Números entre imagens não batem (243 vs 1.256 produtos) | Números vêm dos mocks/serviços, calculados a partir de um único conjunto de dados relacionados. |
| 10 | Larguras de sidebar variam alguns px entre renders | Normalizado em 224 px. |
| 11 | Rodapé da sidebar com card de condomínio e card de usuário | **Removidos por decisão do produto.** O usuário já está no header e não há troca de condomínio neste escopo. |
| 12 | As referências não mostram o sino nem o `?` abertos | Painel de notificações e menu de ajuda especificados abaixo, reutilizando os padrões de dropdown/card já existentes. |
| 13 | O número da venda aparece como `#0001256` na listagem e `#VDA-000286` no detalhe | Adotado **`#VDA-001094`** nas duas telas: é o formato do detalhe, que também aparece na migalha e no título, e não se confunde com outros identificadores. |
| 14 | A listagem traz "Nova venda" e "Exportar"; o detalhe traz "Imprimir", "Cancelar (estornar)" e "Mais ações" | **Removidos por decisão do produto.** No detalhe restam apenas as três **Ações rápidas** do card lateral — inclusive "Imprimir comprovante", que é o mesmo atalho do ícone de impressora na listagem. |
| 15 | A busca da listagem de vendas não tem rótulo, ao contrário das demais telas | Mantida sem rótulo, alinhada pela base dos selects, como na referência. |
| 16 | O detalhe mostra três colunas de larguras diferentes (≈463 / 270 / 390 px) | Reproduzido com `grid-cols-[1.5fr_0.95fr_1.3fr]` a partir de `xl`; abaixo disso vira duas colunas e depois uma. |

---

## Header — notificações e ajuda

As referências mostram apenas os ícones fechados (sino com badge âmbar e `?`). O
comportamento foi definido reaproveitando padrões que já existem no design system —
dropdown com borda 1px + `shadow-pop`, ícone tintado em container radius 12, badges e
empty states — para que não pareçam peças de outro produto.

### Sino — painel de notificações

Dropdown de 380 px ancorado à direita do sino:

- **Header** — "Notificações" + pill âmbar `N novas` + ação "Marcar todas como lidas"
  (desabilitada quando não há não-lidas).
- **Lista** — por item: ícone tintado pela severidade (vermelho ruptura, âmbar
  validade/perda, azul abastecimento, verde compra), título (negrito quando não lida),
  descrição, horário relativo ("Hoje, 18:26") e ponto teal de não-lida. A linha inteira é
  clicável e leva à tela correspondente, marcando como lida.
- **Rodapé** — "Ver todas as movimentações".
- **Vazio** — `EmptyState` compacto: "Nenhuma notificação / Você está em dia com a operação."

Cada notificação é **derivada de um fato real** da operação, não de um mock estático:
ruptura de estoque, lotes vencendo em até 7 dias, sugestão de abastecimento, última compra
confirmada e última perda registrada. O estado "lida" persiste.

### Avatar — menu da conta

Dropdown de 328 px, dividido em blocos:

- **Identidade** — avatar, nome, e-mail e a função como badge teal.
- **Loja em uso** — a loja em contexto com o condomínio abaixo e um check. Com mais de uma
  loja o bloco vira "Trocar de loja" e as linhas ficam selecionáveis. Este é o lugar canônico
  do contexto de loja (o mesmo padrão de *workspace* de outros sistemas) — foi por isso que
  ele pôde sair da sidebar sem se perder.
- **Ações** — "Meu perfil" (leva a Configurações, onde o perfil vive) e "Atalhos do teclado"
  com a tecla `?` indicada.
- **Demonstração** — bloco próprio para "Restaurar dados", com a consequência descrita.
- **Sair** — isolado no rodapé, em vermelho.
- **Rodapé** — versão e ambiente.

Não foram incluídos itens sem destino real (plano/cobrança, equipe, tema claro/escuro): sem
tela ou funcionalidade por trás, seriam UI morta.

### `?` — menu de ajuda

Dropdown de 300 px com quatro itens:

| Item | O que faz |
|---|---|
| **Guia de uso** | leva à tela Início (o passo a passo da operação) |
| **Atalhos do teclado** | abre o diálogo de atalhos (também acessível por `?`) |
| **Novidades da versão** | resumo do que mudou nesta atualização |
| **Falar com o suporte** | informa que o canal chega junto com a API |

O diálogo de atalhos lista **apenas atalhos realmente implementados**: `⌘K` (busca), `?`
(esta lista), `Esc` (fechar) e a navegação em sequência `G` + tecla (`G I` Início, `G P`
Painel, `G D` Produtos, `G F` Fornecedores, `G C` Compras, `G E` Estoque central,
`G A` Abastecimento, `G M` Movimentações).

---

## Checklist de aceite visual (aplicado por tela)

- [ ] Sidebar 224px, item ativo teal claro, accordion correto
- [ ] Header 76px com busca + ⌘K + sino/3 + ajuda + usuário
- [ ] Content inicia em 32px de padding
- [ ] Cards com borda 1px `#E3E8EA`, radius 14, sombra quase nula
- [ ] Tabela: header claro, linha ~62px, badges pill
- [ ] Botão primário teal 44px radius 10
- [ ] Título de página Sora 34px
- [ ] Paleta contida: teal + amber pontual + funcionais

## Formulário de fornecedor alinhado ao de produto

O cadastro de fornecedor usava um único cartão com `fieldset`/`legend` separados por borda,
sem ícones. O de produto usa `SectionCard` independentes, cada um com ícone, título e uma
linha de descrição.

Como os dois são formulários de cadastro no mesmo nível da navegação, duas gramáticas
visuais diferentes para a mesma tarefa era ruído. O de fornecedor foi convertido para o
padrão do produto: **Dados principais** (Building2), **Contato principal** (UserRound),
**Endereço** (MapPin), **Comercial** (Handshake) e **Observações** (NotebookPen), com o
rodapé de ações em cartão próprio.

O esqueleto já era comum — cabeçalho, grade `1fr / ~320px` e coluna lateral. A divergência
estava só no agrupamento das seções.

---

## Marca

`references/logo` traz 12 arquivos. Nove foram aproveitados, três descartados por serem as
mesmas composições em fundo cinza texturizado, com qualidade inferior às equivalentes em
fundo branco.

Os aproveitados estão em `apps/web/public/marca`:

| Arquivo | Origem | Onde serve |
|---|---|---|
| `mercalya-horizontal.png` | 16_02_31 (2) | uso geral, documentos |
| `mercalya-horizontal-tagline.png` | 16_02_31 (1) | **og:image** — lê melhor em cartão largo |
| `mercalya-vertical.png` | 16_02_32 (4) | material impresso, formatos altos |
| `mercalya-fundo-escuro.png` | 16_01_15 (6) | peças sobre fundo escuro |
| `mercalya-monocromatica.png` | 16_01_15 (5) | uma cor só, fax/carimbo |
| `simbolo.png` | 16_01_15 (8) | ícone alternativo do navegador |
| `simbolo-transparente.png` | 16_02_32 (3) | sobreposições |
| `app-icon-claro.png` | 16_01_13 (3) | **apple-touch-icon** |
| `app-icon-escuro.png` | 16_01_13 (4) | variante para tema escuro |

### Duas lacunas que a análise revelou

O `index.html` **não tinha favicon nenhum** — a aba mostrava o ícone genérico. Também não
havia `description` nem meta tags de compartilhamento: um link colado no WhatsApp aparecia
sem título, sem resumo e sem imagem.

### A interface usa a imagem, não um redesenho

Uma primeira versão vetorizou o símbolo em SVG. Foi descartada: por mais que a geometria
tenha sido medida pixel a pixel, os degradês do original são sobreposições translúcidas em
três planos, e o traçado era uma aproximação. A marca de um produto não deve ser uma
aproximação.

Os PNGs originais, porém, não serviam direto: pesavam de 250KB a 1MB e três deles vinham com
fundo branco ou verde-escuro chapado — um retângulo visível sobre qualquer superfície que
não fosse exatamente aquela cor.

Cada um passou por três tratamentos, feitos no canvas do navegador:

1. **Fundo removido** com alfa proporcional à distância da cor amostrada nos cantos, para o
   antialias não virar franja colorida. Duas imagens já vinham com alfa e foram detectadas
   como tal — aplicar o recorte nelas teria comido a tipografia escura.
2. **Recorte ao conteúdo**, eliminando a margem vazia que dominava o arquivo.
3. **Reamostragem** para o tamanho de uso, com `imageSmoothingQuality: 'high'`.

O resultado são os `ui-*.png`, de 6KB a 143KB — **452KB somados**, contra os 5,9MB dos
originais, que ficam como acervo da marca.

| Arquivo | Tamanho | Onde |
|---|---|---|
| `ui-vertical.png` | 420×408 | sidebar |
| `ui-horizontal.png` | 560×126 | card de login |
| `ui-vertical-claro.png` | 560×413 | painel escuro do login |
| `ui-simbolo.png` | 256×225 | telas de espera |
| `ui-icone-180.png` | 180×158 | apple-touch-icon |
| `ui-favicon-64.png` | 64×56 | favicon |

O nome e a assinatura fazem parte da imagem — são a tipografia da marca, não texto
recomposto em Sora. E toda `<img>` declara `width`/`height`: sem isso o navegador não
reserva o espaço e a sidebar salta quando a marca carrega.

**Não há lockup horizontal claro entre as referências.** Por isso o painel escuro do login
usa a versão empilhada: achatar a colorida daria uma marca que a Mercalya não tem.
