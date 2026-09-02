import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Boxes,
  Calendar,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Percent,
  Receipt,
  RotateCcw,
  ShoppingBag,
  ShoppingCart,
  Store,
  TrendingUp,
  TriangleAlert,
  Users,
} from 'lucide-react'
import type { Alerta, DashboardGerencial } from '@/models'
import { PainelService, AppSession } from '@/services'
import { useRecurso } from '@/lib/useRecurso'
import { cn } from '@/lib/cn'
import { data as formatarData, moeda, numero, percentual } from '@/lib/format'
import { PageContainer } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { CardFooterLink, SectionCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar, Skeleton } from '@/components/ui/Feedback'
import { ProductAvatar } from '@/components/ui/Misc'
import { Select } from '@/components/ui/Form'

/** Rótulo do eixo Y: usa "k" apenas quando a escala justifica. */
/** Progresso do dia contra a meta — só renderizado quando existe meta. */
function MetaDoDia({ vendasHoje, meta }: { vendasHoje: number; meta: number }) {
  const percentual = Math.round((vendasHoje / meta) * 100)
  return (
    <>
      <p className="mt-1.5 text-[11px] text-muted">Meta: {moeda(meta)}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <ProgressBar altura="sm" valor={percentual} />
        <span className="shrink-0 text-[11px] font-medium tabular text-muted">{percentual}%</span>
      </div>
    </>
  )
}

function formatarEixo(valor: number): string {
  if (Math.abs(valor) >= 1000) {
    return `${(valor / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`
  }
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

const HOJE = new Date()
const INICIO_PERIODO = new Date(HOJE.getFullYear(), HOJE.getMonth(), 1)

export function PainelGerencialPage() {
  const navegar = useNavigate()
  const [granularidade, setGranularidade] = useState<'diario' | 'semanal' | 'mensal'>('diario')
  const [loja, setLoja] = useState(AppSession.lojaAtualId())

  const lojas = useRecurso(() => PainelService.lojas(), [])
  const { dados, carregando } = useRecurso(
    () => PainelService.carregar({ lojaId: loja, granularidade }),
    [loja, granularidade],
  )

  return (
    <PageContainer>
      <PageHeader
        titulo="Painel gerencial"
        descricao="Visão completa da performance da sua loja. Monitore vendas, estoque, compras e indicadores operacionais em um só lugar."
        filtros={
          <div className="flex flex-wrap items-start gap-4">
            <div className="w-[210px]">
              <span className="mb-1.5 block text-label font-medium text-ink">Loja</span>
              <Select
                value={loja}
                onChange={(e) => setLoja(e.target.value)}
                opcoes={(lojas.dados ?? []).map((l) => ({ valor: l.id, label: l.nome }))}
              />
            </div>
            <div className="w-[230px]">
              <span className="mb-1.5 block text-label font-medium text-ink">Período</span>
              <div className="flex h-11 items-center justify-between rounded-md border border-line bg-surface px-3.5 text-body text-ink">
                <span className="tabular">
                  {formatarData(INICIO_PERIODO.toISOString())} —{' '}
                  {formatarData(HOJE.toISOString())}
                </span>
                <Calendar className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
              </div>
              <p className="mt-1.5 text-caption text-muted">
                Comparado com: mês anterior
              </p>
            </div>
          </div>
        }
      />

      {/* --------------------------------- KPIs --------------------------------- */}
      {carregando || !dados ? (
        <div className="mc-card grid grid-cols-2 gap-px overflow-hidden bg-line lg:grid-cols-4 xl:grid-cols-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2 bg-surface p-5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      ) : (
        <FaixaKpis kpis={dados.kpis} />
      )}

      {/* -------------------------------- Gráficos ------------------------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <SectionCard
          titulo="Evolução de vendas ao longo do período"
          acoes={
            <Select
              className="h-9 w-[104px] px-2.5 text-[12px]"
              value={granularidade}
              onChange={(e) =>
                setGranularidade(e.target.value as 'diario' | 'semanal' | 'mensal')
              }
              opcoes={[
                { valor: 'diario', label: 'Diário' },
                { valor: 'semanal', label: 'Semanal' },
                { valor: 'mensal', label: 'Mensal' },
              ]}
            />
          }
          classeCorpo="pt-4"
        >
          <div className="mb-3 flex flex-wrap items-center gap-4">
            <LegendaSerie cor="#087F73" rotulo="Vendas (R$)" />
            <LegendaSerie cor="#9FC7C1" rotulo="Média diária (R$)" tracejado />
          </div>
          <div className="h-[220px]">
            {carregando || !dados ? (
              <Skeleton className="h-full rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dados.evolucaoVendas} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
                  <CartesianGrid stroke="#E3E8EA" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#65747E' }}
                    tickLine={false}
                    axisLine={{ stroke: '#E3E8EA' }}
                    interval="preserveStartEnd"
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#65747E' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatarEixo}
                  />
                  <Tooltip content={<TooltipGrafico />} />
                  <Line
                    type="monotone"
                    dataKey="valor"
                    name="Vendas (R$)"
                    stroke="#087F73"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#087F73' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="comparativo"
                    name="Média diária (R$)"
                    stroke="#9FC7C1"
                    strokeWidth={1.5}
                    strokeDasharray="5 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>

        <SectionCard titulo="Compras x vendas" classeCorpo="pt-4">
          <div className="mb-3 flex flex-wrap items-center gap-4">
            <LegendaSerie cor="#087F73" rotulo="Vendas (R$)" />
            <LegendaSerie cor="#F4A629" rotulo="Compras (R$)" />
          </div>
          <div className="h-[220px]">
            {carregando || !dados ? (
              <Skeleton className="h-full rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dados.comprasXVendas}
                  margin={{ top: 4, right: 8, bottom: 0, left: -12 }}
                  barGap={4}
                >
                  <CartesianGrid stroke="#E3E8EA" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#65747E' }}
                    tickLine={false}
                    axisLine={{ stroke: '#E3E8EA' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#65747E' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatarEixo}
                  />
                  <Tooltip content={<TooltipGrafico />} cursor={{ fill: '#F1F4F5' }} />
                  <Bar dataKey="valor" name="Vendas (R$)" fill="#087F73" radius={[3, 3, 0, 0]} maxBarSize={16} />
                  <Bar
                    dataKey="comparativo"
                    name="Compras (R$)"
                    fill="#F4A629"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={16}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>

        <SectionCard
          titulo="Distribuição por categoria"
          classeCorpo="pt-4"
          className="lg:col-span-2 xl:col-span-1"
          rodape={
            <CardFooterLink onClick={() => navegar('/cadastros/produtos')}>
              Ver todas categorias
            </CardFooterLink>
          }
        >
          {carregando || !dados ? (
            <Skeleton className="h-[220px] rounded-lg" />
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative h-[200px] w-[200px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dados.distribuicaoCategoria}
                      dataKey="percentual"
                      nameKey="nome"
                      innerRadius={62}
                      outerRadius={92}
                      paddingAngle={1}
                      stroke="none"
                      // A animação de entrada do Pie não resolve o path sob
                      // StrictMode (duplo render) — o donut é estático mesmo.
                      isAnimationActive={false}
                    >
                      {dados.distribuicaoCategoria.map((fatia) => (
                        <Cell key={fatia.categoriaId} fill={fatia.cor} />
                      ))}
                    </Pie>
                    <Tooltip content={<TooltipPizza />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[11px] text-muted">Vendas do mês</span>
                  <span className="mt-0.5 font-display text-label font-semibold tabular text-ink">
                    {moeda(dados.kpis.vendas)}
                  </span>
                </div>
              </div>

              <ul className="min-w-[150px] flex-1 space-y-2.5">
                {dados.distribuicaoCategoria.map((fatia) => (
                  <li key={fatia.categoriaId} className="flex items-center gap-2.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: fatia.cor }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-caption text-ink">
                      {fatia.nome}
                    </span>
                    <span className="shrink-0 text-caption font-medium tabular text-muted">
                      {percentual(fatia.percentual)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ------------------------------ Listas linha 1 --------------------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <SectionCard
          titulo="Produtos com estoque baixo"
          acoes={<Badge tom="amber">{dados?.estoqueBaixo.length ?? 0}</Badge>}
          semPaddingCorpo
          rodape={
            <CardFooterLink onClick={() => navegar('/operacao/estoque-central')}>
              Ver todos com estoque baixo
              <ChevronRight className="h-4 w-4" />
            </CardFooterLink>
          }
        >
          <MiniTabela
            carregando={carregando}
            cabecalhos={['Produto', 'Estoque', 'Mínimo', 'Ação']}
            vazio="Nenhum produto com estoque baixo."
            linhas={(dados?.estoqueBaixo ?? []).map((p) => [
              <span key="n" className="truncate text-body text-ink">
                {p.nome}
              </span>,
              <span key="e" className="tabular text-body text-danger">
                {p.estoque} un
              </span>,
              <span key="m" className="tabular text-body text-muted">
                {p.minimo} un
              </span>,
              <Link key="a" to="/operacao/estoque-central" className="text-label font-medium text-teal">
                Ver
              </Link>,
            ])}
          />
        </SectionCard>

        <SectionCard
          titulo="Produtos próximos do vencimento"
          acoes={<Badge tom="warning">{dados?.proximosVencimentos.length ?? 0}</Badge>}
          semPaddingCorpo
          rodape={
            <CardFooterLink onClick={() => navegar('/operacao/perdas-ajustes')}>
              Ver todos próximos do vencimento
              <ChevronRight className="h-4 w-4" />
            </CardFooterLink>
          }
        >
          <MiniTabela
            carregando={carregando}
            cabecalhos={['Produto', 'Vencimento', 'Dias', 'Ação']}
            vazio="Nenhum vencimento próximo."
            linhas={(dados?.proximosVencimentos ?? []).map((p) => [
              <span key="n" className="truncate text-body text-ink">
                {p.nome}
              </span>,
              <span key="v" className="tabular text-body text-muted">
                {formatarData(p.validade)}
              </span>,
              <span
                key="d"
                className={cn(
                  'tabular text-body',
                  p.dias <= 7 ? 'text-danger' : p.dias <= 15 ? 'text-[#D68A0F]' : 'text-muted',
                )}
              >
                {p.dias} dias
              </span>,
              <Link key="a" to="/operacao/perdas-ajustes" className="text-label font-medium text-teal">
                Ver
              </Link>,
            ])}
          />
        </SectionCard>

        <SectionCard
          titulo="Top produtos mais vendidos"
          semPaddingCorpo
          className="lg:col-span-2 xl:col-span-1"
          rodape={
            <CardFooterLink onClick={() => navegar('/vendas')}>
              Ver ranking completo
              <ChevronRight className="h-4 w-4" />
            </CardFooterLink>
          }
        >
          <MiniTabela
            carregando={carregando}
            cabecalhos={['#', 'Produto', 'Qtd. vendida', 'Receita (R$)']}
            vazio="Nenhuma venda registrada."
            linhas={(dados?.topVendidos ?? []).map((p, i) => [
              <span key="i" className="tabular text-body text-muted">
                {i + 1}
              </span>,
              <span key="n" className="flex min-w-0 items-center gap-2">
                <ProductAvatar imagem={p.imagem} tamanho="sm" />
                <span className="truncate text-body text-ink">{p.nome}</span>
              </span>,
              <span key="q" className="tabular text-body text-muted">
                {numero(p.quantidade)} un
              </span>,
              <span key="r" className="tabular text-body font-medium text-ink">
                {moeda(p.receita)}
              </span>,
            ])}
          />
        </SectionCard>
      </div>

      {/* ------------------------------ Listas linha 2 --------------------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <SectionCard
          titulo="Produtos sem giro (há mais de 30 dias)"
          acoes={<Badge tom="purple">{dados?.semGiro.length ?? 0}</Badge>}
          semPaddingCorpo
          rodape={
            <CardFooterLink onClick={() => navegar('/cadastros/produtos')}>
              Ver todos sem giro
              <ChevronRight className="h-4 w-4" />
            </CardFooterLink>
          }
        >
          <MiniTabela
            carregando={carregando}
            cabecalhos={['Produto', 'Última venda', 'Estoque', 'Valor', 'Ação']}
            vazio="Todos os produtos tiveram giro recente."
            linhas={(dados?.semGiro ?? []).map((p) => [
              <span key="n" className="truncate text-body text-ink">
                {p.nome}
              </span>,
              <span key="u" className="tabular text-body text-muted">
                {p.ultimaVenda ? formatarData(p.ultimaVenda) : 'Nunca'}
              </span>,
              <span key="e" className="tabular text-body text-muted">
                {p.estoque} un
              </span>,
              <span key="v" className="tabular text-body text-ink">
                {moeda(p.valor)}
              </span>,
              <Link key="a" to="/cadastros/produtos" className="text-label font-medium text-teal">
                Ver
              </Link>,
            ])}
          />
        </SectionCard>

        <SectionCard
          titulo="Alertas importantes"
          classeCorpo="space-y-2.5 pt-4"
          rodape={
            <CardFooterLink onClick={() => navegar('/inicio')}>
              Ver todas as alertas
              <ChevronRight className="h-4 w-4" />
            </CardFooterLink>
          }
        >
          {carregando || !dados ? (
            <div className="space-y-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-md" />
              ))}
            </div>
          ) : (
            dados.alertas.map((alerta) => <LinhaAlerta key={alerta.id} alerta={alerta} />)
          )}
        </SectionCard>

        <SectionCard
          titulo="Resumo operacional da loja"
          className="lg:col-span-2 xl:col-span-1"
          acoes={
            <Select
              className="h-9 w-[92px] px-2.5 text-[12px]"
              value="hoje"
              onChange={() => undefined}
              opcoes={[
                { valor: 'hoje', label: 'Hoje' },
                { valor: 'semana', label: 'Semana' },
              ]}
            />
          }
          classeCorpo="pt-4"
        >
          {carregando || !dados ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <MiniCard
                icone={<ShoppingCart className="h-4.5 w-4.5" strokeWidth={1.75} />}
                tom="teal"
                rotulo="Vendas hoje"
                valor={moeda(dados.resumoOperacional.vendasHoje)}
                extra={
                  // Sem meta cadastrada não há barra: uma meta inventada faria
                  // o lojista medir o dia contra um alvo que ninguém definiu.
                  dados.resumoOperacional.metaVendas ? (
                    <MetaDoDia
                      vendasHoje={dados.resumoOperacional.vendasHoje}
                      meta={dados.resumoOperacional.metaVendas}
                    />
                  ) : (
                    <p className="mt-1.5 text-[11px] text-muted">
                      {dados.resumoOperacional.clientesAtendidos}{' '}
                      {dados.resumoOperacional.clientesAtendidos === 1 ? 'venda' : 'vendas'} até
                      agora
                    </p>
                  )
                }
              />
              <MiniCard
                icone={<Users className="h-4.5 w-4.5" strokeWidth={1.75} />}
                tom="info"
                rotulo="Clientes atendidos"
                valor={numero(dados.resumoOperacional.clientesAtendidos)}
                extra={
                  <p className="mt-1.5 text-[11px] text-muted">
                    Ticket médio: {moeda(dados.resumoOperacional.ticketMedioHoje)}
                  </p>
                }
              />
              <MiniCard
                icone={<ShoppingBag className="h-4.5 w-4.5" strokeWidth={1.75} />}
                tom="success"
                rotulo="Produtos vendidos"
                valor={`${numero(dados.resumoOperacional.produtosVendidos)} un`}
                extra={
                  <p className="mt-1.5 text-[11px] text-success">
                    ↑ {dados.resumoOperacional.produtosVendidosDelta}% vs ontem
                  </p>
                }
              />
              <MiniCard
                icone={<RotateCcw className="h-4.5 w-4.5" strokeWidth={1.75} />}
                tom="danger"
                rotulo="Devoluções"
                valor={moeda(dados.resumoOperacional.devolucoes)}
                extra={
                  <p className="mt-1.5 text-[11px] text-muted">
                    {percentual(dados.resumoOperacional.percentualDevolucoes)} das vendas
                  </p>
                }
              />
            </div>
          )}
        </SectionCard>
      </div>
    </PageContainer>
  )
}

/* ------------------------------------------------------------------ */
/* Faixa de KPIs — card único dividido por separadores (ref. Painel)   */
/* ------------------------------------------------------------------ */

function FaixaKpis({ kpis }: { kpis: DashboardGerencial['kpis'] }) {
  const celulas = [
    {
      rotulo: 'Vendas do mês',
      valor: moeda(kpis.vendas),
      delta: kpis.vendasDelta,
      icone: <ShoppingCart className="h-4 w-4" strokeWidth={1.75} />,
      tom: 'teal',
    },
    {
      rotulo: 'Lucro estimado',
      valor: moeda(kpis.lucro),
      delta: kpis.lucroDelta,
      icone: <TrendingUp className="h-4 w-4" strokeWidth={1.75} />,
      tom: 'success',
    },
    {
      rotulo: 'Ticket médio',
      valor: moeda(kpis.ticketMedio),
      delta: kpis.ticketMedioDelta,
      icone: <Receipt className="h-4 w-4" strokeWidth={1.75} />,
      tom: 'info',
    },
    {
      rotulo: 'Margem',
      valor: percentual(kpis.margem),
      delta: kpis.margemDelta,
      sufixoDelta: 'p.p. vs mês anterior',
      icone: <Percent className="h-4 w-4" strokeWidth={1.75} />,
      tom: 'amber',
    },
    {
      rotulo: 'Valor em estoque',
      valor: moeda(kpis.valorEstoque),
      delta: kpis.valorEstoqueDelta,
      icone: <Boxes className="h-4 w-4" strokeWidth={1.75} />,
      tom: 'neutro',
    },
    {
      rotulo: 'Itens na loja',
      valor: numero(kpis.itensLoja),
      delta: kpis.itensLojaDelta,
      icone: <Store className="h-4 w-4" strokeWidth={1.75} />,
      tom: 'purple',
    },
    {
      rotulo: 'Compras do mês',
      valor: moeda(kpis.compras),
      delta: kpis.comprasDelta,
      icone: <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />,
      tom: 'info',
    },
    {
      rotulo: 'Perdas do mês',
      valor: moeda(kpis.perdas),
      delta: kpis.perdasDelta,
      invertido: true,
      icone: <TriangleAlert className="h-4 w-4" strokeWidth={1.75} />,
      tom: 'danger',
    },
  ] as const

  const fundos: Record<string, string> = {
    teal: 'bg-teal-50 text-teal',
    success: 'bg-success-50 text-success',
    info: 'bg-info-50 text-info',
    amber: 'bg-amber-50 text-[#D68A0F]',
    danger: 'bg-danger-50 text-danger',
    purple: 'bg-[#F1EDFC] text-[#6D4FD0]',
    neutro: 'bg-surface-2 text-muted',
  }

  return (
    <div className="mc-card grid grid-cols-2 gap-px overflow-hidden bg-line md:grid-cols-4 xl:grid-cols-8">
      {celulas.map((celula) => {
        const invertido = 'invertido' in celula && celula.invertido
        const delta = celula.delta
        const positivo = delta !== undefined && (invertido ? delta < 0 : delta > 0)
        return (
          <div key={celula.rotulo} className="bg-surface p-2.5">
            <p className="truncate text-[11px] text-muted">{celula.rotulo}</p>
            <div className="mt-1.5 flex items-center justify-between gap-1.5">
              <p className="min-w-0 truncate font-display text-[14px] font-semibold tabular text-ink">
                {celula.valor}
              </p>
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg',
                  fundos[celula.tom],
                )}
                aria-hidden
              >
                {celula.icone}
              </span>
            </div>
            <p className="mt-1.5 truncate text-[11px]">
              {delta === undefined ? (
                // Sem período anterior para comparar, a linha some — "0,0%"
                // afirmaria estabilidade onde não houve medição.
                <span className="text-muted">sem comparação</span>
              ) : (
                <>
                  <span className={cn('font-medium', positivo ? 'text-success' : 'text-danger')}>
                    {delta > 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1).replace('.', ',')}
                    {'sufixoDelta' in celula ? '' : '%'}
                  </span>{' '}
                  <span className="text-muted">
                    {'sufixoDelta' in celula ? celula.sufixoDelta : 'vs mês anterior'}
                  </span>
                </>
              )}
            </p>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */

function LegendaSerie({
  cor,
  rotulo,
  tracejado,
}: {
  cor: string
  rotulo: string
  tracejado?: boolean
}) {
  return (
    <span className="flex items-center gap-2 text-caption text-muted">
      {tracejado ? (
        <span
          className="h-0 w-4 border-t-2 border-dashed"
          style={{ borderColor: cor }}
          aria-hidden
        />
      ) : (
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cor }} aria-hidden />
      )}
      {rotulo}
    </span>
  )
}

interface PayloadTooltip {
  name?: string
  value?: number
  color?: string
  payload?: { nome?: string; percentual?: number; cor?: string; valor?: number }
}

function TooltipGrafico({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: PayloadTooltip[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-line bg-surface p-3 shadow-pop">
      <p className="mb-1.5 text-caption font-medium text-ink">{label}</p>
      {payload.map((item, i) => (
        <p key={i} className="flex items-center gap-2 text-caption text-muted">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          {item.name}
          <span className="ml-auto pl-3 font-medium tabular text-ink">
            {moeda(item.value ?? 0)}
          </span>
        </p>
      ))}
    </div>
  )
}

function TooltipPizza({ active, payload }: { active?: boolean; payload?: PayloadTooltip[] }) {
  if (!active || !payload?.length) return null
  const fatia = payload[0].payload
  return (
    <div className="rounded-lg border border-line bg-surface p-3 shadow-pop">
      <p className="text-caption font-medium text-ink">{fatia?.nome}</p>
      <p className="mt-0.5 text-caption text-muted">
        {percentual(fatia?.percentual ?? 0)} · {moeda(fatia?.valor ?? 0)}
      </p>
    </div>
  )
}

function MiniTabela({
  cabecalhos,
  linhas,
  carregando,
  vazio,
}: {
  cabecalhos: string[]
  linhas: React.ReactNode[][]
  carregando?: boolean
  vazio: string
}) {
  if (carregando) {
    return (
      <div className="space-y-2.5 px-5 pb-5 pt-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-6" />
        ))}
      </div>
    )
  }

  if (linhas.length === 0) {
    return <p className="px-5 pb-6 pt-2 text-caption text-muted">{vazio}</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="mc-table-head">
            {cabecalhos.map((c, i) => (
              <th
                key={c}
                className={cn(
                  'whitespace-nowrap px-5 py-2.5 text-[11.5px] font-medium',
                  i === cabecalhos.length - 1 && 'text-right',
                )}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, i) => (
            <tr key={i} className="border-b border-line last:border-0">
              {linha.map((celula, j) => (
                <td
                  key={j}
                  className={cn(
                    'max-w-[190px] px-5 py-2.5',
                    j === linha.length - 1 && 'text-right',
                  )}
                >
                  {celula}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LinhaAlerta({ alerta }: { alerta: Alerta }) {
  const estilos = {
    critico: { fundo: 'border-danger-100 bg-danger-50/60 hover:bg-danger-50', cor: 'text-danger' },
    atencao: { fundo: 'border-amber-100 bg-amber-50/60 hover:bg-amber-50', cor: 'text-[#D68A0F]' },
    info: { fundo: 'border-info-100 bg-info-50/60 hover:bg-info-50', cor: 'text-info' },
    sucesso: {
      fundo: 'border-success-100 bg-success-50/60 hover:bg-success-50',
      cor: 'text-success',
    },
  }[alerta.severidade]

  const Icone =
    alerta.severidade === 'critico' || alerta.severidade === 'atencao'
      ? TriangleAlert
      : alerta.severidade === 'sucesso'
        ? CircleCheck
        : CircleAlert

  return (
    <Link
      to={alerta.rota}
      className={cn('flex items-center gap-3 rounded-md border px-3.5 py-3 transition-colors', estilos.fundo)}
    >
      <Icone className={cn('h-4.5 w-4.5 shrink-0', estilos.cor)} strokeWidth={1.75} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-label font-medium text-ink">{alerta.titulo}</span>
        <span className="block truncate text-caption text-muted">{alerta.descricao}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
    </Link>
  )
}

function MiniCard({
  icone,
  tom,
  rotulo,
  valor,
  extra,
}: {
  icone: React.ReactNode
  tom: 'teal' | 'info' | 'success' | 'danger'
  rotulo: string
  valor: string
  extra?: React.ReactNode
}) {
  const fundos = {
    teal: 'bg-teal-50 text-teal',
    info: 'bg-info-50 text-info',
    success: 'bg-success-50 text-success',
    danger: 'bg-danger-50 text-danger',
  }
  return (
    <div className="rounded-lg border border-line p-3.5">
      <div className="flex items-start gap-2.5">
        <span
          className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', fundos[tom])}
          aria-hidden
        >
          {icone}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] text-muted">{rotulo}</p>
          <p className="mt-0.5 truncate font-display text-card-title font-semibold tabular text-ink">
            {valor}
          </p>
        </div>
      </div>
      {extra}
    </div>
  )
}
