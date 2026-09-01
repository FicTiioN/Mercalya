import { Link, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleDot,
  Clock,
  Lightbulb,
  Package,
  Plus,
  ShoppingCart,
  Store,
  Target,
  TriangleAlert,
  Truck,
  Users,
  Warehouse,
  Zap,
} from 'lucide-react'
import type { EtapaInicio, SeveridadeAlerta } from '@/models'
import { InicioService } from '@/services'
import { useRecurso } from '@/lib/useRecurso'
import { cn } from '@/lib/cn'
import { moeda, numero, quando } from '@/lib/format'
import { PageContainer } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard, CardFooterLink } from '@/components/ui/Card'
import { MetricCard, MetricGrid } from '@/components/ui/MetricCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ProgressBar, Skeleton, SkeletonCard, SkeletonLinhas } from '@/components/ui/Feedback'
import { Avatar } from '@/components/ui/Misc'
import { iconesEtapa } from '@/app/navigation'

const acoesRapidas = [
  { rotulo: 'Novo produto', rota: '/cadastros/produtos/novo', icone: Plus, tom: 'teal' as const },
  {
    rotulo: 'Novo fornecedor',
    rota: '/cadastros/fornecedores/novo',
    icone: Plus,
    tom: 'teal' as const,
  },
  {
    rotulo: 'Nova compra',
    rota: '/operacao/compras/nova',
    icone: ShoppingCart,
    tom: 'teal' as const,
  },
  { rotulo: 'Abastecer loja', rota: '/operacao/abastecimento', icone: Truck, tom: 'amber' as const },
  {
    rotulo: 'Registrar perda',
    rota: '/operacao/perdas-ajustes',
    icone: TriangleAlert,
    tom: 'danger' as const,
  },
]

export function InicioPage() {
  const navegar = useNavigate()
  const { dados, carregando } = useRecurso(() => InicioService.resumo(), [])
  const dicas = useRecurso(() => InicioService.dicas(), [])

  return (
    <PageContainer>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        {/* --------------------------- coluna principal --------------------------- */}
        <div className="flex min-w-0 flex-col gap-6">
          <PageHeader
            titulo="Início"
            descricao="Este é o seu guia de uso do Mercalya. Siga o fluxo recomendado para uma operação eficiente ou utilize as ações rápidas para executar tarefas do dia a dia."
          />

          <SectionCard
            className="overflow-visible"
            titulo={
              <span className="flex items-center gap-3">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-teal"
                  aria-hidden
                >
                  <BookOpen className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <span>
                  <span className="block font-display text-section-title font-semibold text-ink">
                    Como usar o Mercalya
                  </span>
                  <span className="mt-0.5 block text-caption font-normal text-muted">
                    Siga os passos abaixo para estruturar e operar sua loja com eficiência.
                  </span>
                </span>
              </span>
            }
            acoes={
              dados && (
                <Badge tom="success">
                  {dados.etapasConcluidas} de {dados.totalEtapas} concluídos
                </Badge>
              )
            }
            classeCorpo="pt-6"
          >
            {carregando || !dados ? (
              <EsqueletoEtapas />
            ) : (
              <>
                <TrilhaNumeros etapas={dados.etapas} />
                <div className="mt-5 flex items-stretch gap-1">
                  {dados.etapas.map((etapa, i) => (
                    <div key={etapa.chave} className="flex min-w-0 flex-1 items-center">
                      <CartaoEtapa etapa={etapa} aoNavegar={navegar} />
                      {i < dados.etapas.length - 1 && (
                        <ChevronRight
                          className="mx-0.5 hidden h-4 w-4 shrink-0 text-line lg:block"
                          aria-hidden
                        />
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </SectionCard>

          <MetricGrid>
            {carregando || !dados ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              <>
                <MetricCard
                  rotulo="Produtos cadastrados"
                  valor={numero(dados.indicadores.produtosCadastrados)}
                  icone={<Package className="h-5 w-5" strokeWidth={1.75} />}
                  tom="teal"
                  delta={dados.indicadores.produtosDelta}
                  onClick={() => navegar('/cadastros/produtos')}
                />
                <MetricCard
                  rotulo="Fornecedores ativos"
                  valor={numero(dados.indicadores.fornecedoresAtivos)}
                  icone={<Users className="h-5 w-5" strokeWidth={1.75} />}
                  tom="info"
                  auxiliar={
                    <span className="text-success">
                      ↑ {dados.indicadores.fornecedoresNovosMes} novos este mês
                    </span>
                  }
                  onClick={() => navegar('/cadastros/fornecedores')}
                />
                <MetricCard
                  rotulo="Compras da semana"
                  valor={moeda(dados.indicadores.comprasSemana)}
                  icone={<ShoppingCart className="h-5 w-5" strokeWidth={1.75} />}
                  tom="amber"
                  delta={dados.indicadores.comprasDelta}
                  deltaSufixo="vs semana anterior"
                  onClick={() => navegar('/operacao/compras')}
                />
                <MetricCard
                  rotulo="Itens na loja"
                  valor={numero(dados.indicadores.itensNaLoja)}
                  icone={<Store className="h-5 w-5" strokeWidth={1.75} />}
                  tom="purple"
                  auxiliar={`${dados.indicadores.percentualDoCentral}% do estoque total`}
                  onClick={() => navegar('/operacao/loja')}
                />
              </>
            )}
          </MetricGrid>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SectionCard
              icone={<Clock className="h-5 w-5" strokeWidth={1.75} />}
              titulo="Atividades recentes"
              classeCorpo="pt-4"
              rodape={
                <CardFooterLink onClick={() => navegar('/operacao/movimentacoes')}>
                  Ver todas as atividades
                  <ChevronRight className="h-4 w-4" />
                </CardFooterLink>
              }
            >
              {carregando || !dados ? (
                <SkeletonLinhas linhas={4} />
              ) : (
                <ul className="-my-1">
                  {dados.atividades.map((atividade) => (
                    <li
                      key={atividade.id}
                      className="flex items-center gap-3 border-b border-line py-3 last:border-0"
                    >
                      <span
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                          tomAtividade(atividade.tipo),
                        )}
                        aria-hidden
                      >
                        {iconeAtividade(atividade.tipo)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-label font-medium text-ink">
                          {atividade.titulo}
                        </p>
                        <p className="truncate text-caption text-muted">{atividade.descricao}</p>
                      </div>
                      <span className="hidden shrink-0 text-caption text-muted sm:block">
                        {quando(atividade.quando)}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <Avatar iniciais={atividade.iniciais} tamanho="xs" />
                        <span className="hidden text-caption text-muted lg:block">
                          {atividade.usuario}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard
              icone={<Target className="h-5 w-5" strokeWidth={1.75} />}
              titulo="Próximas ações sugeridas"
              classeCorpo="pt-4"
              rodape={
                <CardFooterLink onClick={() => navegar('/painel-gerencial')}>
                  Ver todas as sugestões
                  <ChevronRight className="h-4 w-4" />
                </CardFooterLink>
              }
            >
              {carregando || !dados ? (
                <SkeletonLinhas linhas={3} />
              ) : (
                <ul className="space-y-2.5">
                  {dados.sugestoes.map((sugestao) => (
                    <li key={sugestao.id}>
                      <Link
                        to={sugestao.rota}
                        className={cn(
                          'flex items-center gap-3 rounded-md border px-3.5 py-3 transition-colors',
                          fundoSeveridade(sugestao.severidade),
                        )}
                      >
                        <span className="shrink-0" aria-hidden>
                          {iconeSeveridade(sugestao.severidade)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-label font-medium text-ink">
                            {sugestao.titulo}
                          </span>
                          <span className="block truncate text-caption text-muted">
                            {sugestao.descricao}
                          </span>
                        </span>
                        {sugestao.quantidade !== null && (
                          <Badge tom={badgeSeveridade(sugestao.severidade)}>
                            {sugestao.quantidade} itens
                          </Badge>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>
        </div>

        {/* ----------------------------- coluna lateral ---------------------------- */}
        <aside className="flex min-w-0 flex-col gap-4 xl:pt-[104px]">
          <SectionCard classeCorpo="p-5">
            <h2 className="font-display text-card-title font-semibold text-ink">
              Progresso da configuração
            </h2>
            <p className="mt-1 text-caption text-muted">Seu avanço no fluxo recomendado</p>
            <div className="mt-4 flex items-center gap-3">
              <ProgressBar valor={dados?.progresso ?? 0} className="flex-1" />
              <span className="shrink-0 text-label font-semibold tabular text-ink">
                {dados?.progresso ?? 0}%
              </span>
            </div>
          </SectionCard>

          <SectionCard
            icone={<Zap className="h-5 w-5" strokeWidth={1.75} />}
            titulo="Ações rápidas"
            classeCorpo="space-y-2.5 pt-4"
            rodape={
              <CardFooterLink onClick={() => navegar('/configuracoes')}>
                Ver todas as ações
                <ChevronRight className="h-4 w-4" />
              </CardFooterLink>
            }
          >
            {acoesRapidas.map((acao) => {
              const Icone = acao.icone
              return (
                <Link
                  key={acao.rota + acao.rotulo}
                  to={acao.rota}
                  className={cn(
                    'flex items-center gap-3 rounded-md border px-3.5 py-3 transition-colors',
                    acao.tom === 'amber'
                      ? 'border-amber-100 bg-amber-50/50 hover:bg-amber-50'
                      : acao.tom === 'danger'
                        ? 'border-danger-100 bg-danger-50/40 hover:bg-danger-50'
                        : 'border-line bg-surface hover:border-teal-100 hover:bg-teal-50',
                  )}
                >
                  <Icone
                    className={cn(
                      'h-4.5 w-4.5 shrink-0',
                      acao.tom === 'amber'
                        ? 'text-[#D68A0F]'
                        : acao.tom === 'danger'
                          ? 'text-danger'
                          : 'text-teal',
                    )}
                    strokeWidth={1.75}
                  />
                  <span
                    className={cn(
                      'flex-1 text-label font-medium',
                      acao.tom === 'danger' ? 'text-danger' : 'text-ink',
                    )}
                  >
                    {acao.rotulo}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                </Link>
              )
            })}
          </SectionCard>

          <SectionCard
            icone={<Lightbulb className="h-5 w-5 text-amber" strokeWidth={1.75} />}
            titulo="Dicas de uso"
            classeCorpo="pt-4"
            rodape={
              <CardFooterLink onClick={() => navegar('/configuracoes')}>
                Ver mais dicas
                <ChevronRight className="h-4 w-4" />
              </CardFooterLink>
            }
          >
            {dicas.carregando || !dicas.dados ? (
              <div className="space-y-3">
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
              </div>
            ) : (
              <ul className="space-y-3.5">
                {dicas.dados.map((dica) => (
                  <li key={dica.id} className="flex gap-2.5">
                    <CircleCheck
                      className="mt-0.5 h-4.5 w-4.5 shrink-0 text-teal"
                      strokeWidth={1.75}
                    />
                    <span className="text-caption leading-relaxed text-muted">{dica.texto}</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </aside>
      </div>
    </PageContainer>
  )
}

/* ------------------------------------------------------------------ */

function TrilhaNumeros({ etapas }: { etapas: EtapaInicio[] }) {
  return (
    <ol className="flex items-center px-2">
      {etapas.map((etapa, i) => (
        <li key={etapa.chave} className="flex flex-1 items-center last:flex-none">
          <span
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-label font-semibold',
              etapa.estado === 'concluido' && 'bg-teal text-white',
              etapa.estado === 'em-andamento' && 'bg-amber text-white',
              etapa.estado === 'pendente' && 'border border-line bg-surface-2 text-muted',
            )}
          >
            {etapa.ordem}
          </span>
          {i < etapas.length - 1 && (
            <span
              className="mx-1 h-px flex-1 border-t border-dashed border-line"
              aria-hidden
            />
          )}
        </li>
      ))}
    </ol>
  )
}

function CartaoEtapa({
  etapa,
  aoNavegar,
}: {
  etapa: EtapaInicio
  aoNavegar: (rota: string) => void
}) {
  const Icone = iconesEtapa[etapa.icone] ?? Package
  const emAndamento = etapa.estado === 'em-andamento'

  return (
    <article
      className={cn(
        'flex min-w-0 flex-1 flex-col items-center rounded-xl border p-3 text-center transition-colors',
        emAndamento ? 'border-amber-100 bg-amber-50/50' : 'border-line bg-surface',
      )}
    >
      <span
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full',
          etapa.estado === 'concluido' && 'bg-teal-50 text-teal',
          emAndamento && 'bg-amber-100 text-[#D68A0F]',
          etapa.estado === 'pendente' && 'bg-surface-2 text-muted',
        )}
        aria-hidden
      >
        <Icone className="h-5 w-5" strokeWidth={1.75} />
      </span>

      <h3 className="mt-2.5 font-display text-label font-semibold leading-tight text-ink">
        {etapa.titulo}
      </h3>
      <p className="mt-1.5 text-[11px] leading-snug text-muted">{etapa.descricao}</p>

      <span className="mt-3">
        <Badge
          tom={
            etapa.estado === 'concluido'
              ? 'success'
              : etapa.estado === 'em-andamento'
                ? 'amber'
                : 'neutro'
          }
          icone={
            etapa.estado === 'concluido' ? (
              <CircleCheck className="h-3 w-3" strokeWidth={2} />
            ) : etapa.estado === 'em-andamento' ? (
              <CircleDot className="h-3 w-3" strokeWidth={2} />
            ) : (
              <CircleAlert className="h-3 w-3" strokeWidth={2} />
            )
          }
        >
          {etapa.estado === 'concluido'
            ? 'Concluído'
            : etapa.estado === 'em-andamento'
              ? 'Em andamento'
              : 'Pendente'}
        </Badge>
      </span>

      <p className="mt-3 font-display text-[19px] font-semibold leading-none tabular text-ink">
        {etapa.metrica}
      </p>
      <p className="mt-1 text-[11px] text-muted">{etapa.metricaLabel}</p>

      <Button
        tamanho="sm"
        variante={etapa.ctaVariante}
        blocoCompleto
        className="mt-3 h-auto min-h-9 !whitespace-normal px-2 py-1.5 text-[12px] leading-tight"
        onClick={() => aoNavegar(etapa.ctaRota)}
      >
        {etapa.ctaLabel}
      </Button>
    </article>
  )
}

function EsqueletoEtapas() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8" />
      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-56 flex-1 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

function iconeAtividade(tipo: string) {
  const classe = 'h-4.5 w-4.5'
  if (tipo === 'ENTRADA') return <ShoppingCart className={classe} strokeWidth={1.75} />
  if (tipo === 'TRANSFERENCIA') return <Truck className={classe} strokeWidth={1.75} />
  if (tipo === 'PERDA') return <TriangleAlert className={classe} strokeWidth={1.75} />
  if (tipo === 'AJUSTE') return <Warehouse className={classe} strokeWidth={1.75} />
  if (tipo === 'VENDA') return <Store className={classe} strokeWidth={1.75} />
  return <Package className={classe} strokeWidth={1.75} />
}

function tomAtividade(tipo: string): string {
  if (tipo === 'ENTRADA') return 'bg-success-50 text-success'
  if (tipo === 'TRANSFERENCIA') return 'bg-amber-50 text-[#D68A0F]'
  if (tipo === 'PERDA') return 'bg-danger-50 text-danger'
  if (tipo === 'AJUSTE') return 'bg-info-50 text-info'
  return 'bg-info-50 text-info'
}

function iconeSeveridade(severidade: SeveridadeAlerta) {
  const classe = 'flex h-8 w-8 items-center justify-center rounded-md'
  if (severidade === 'critico')
    return (
      <span className={cn(classe, 'bg-danger-100 text-danger')}>
        <TriangleAlert className="h-4 w-4" strokeWidth={1.75} />
      </span>
    )
  if (severidade === 'atencao')
    return (
      <span className={cn(classe, 'bg-amber-100 text-[#D68A0F]')}>
        <Truck className="h-4 w-4" strokeWidth={1.75} />
      </span>
    )
  if (severidade === 'sucesso')
    return (
      <span className={cn(classe, 'bg-success-100 text-success')}>
        <CircleCheck className="h-4 w-4" strokeWidth={1.75} />
      </span>
    )
  return (
    <span className={cn(classe, 'bg-info-100 text-info')}>
      <CircleAlert className="h-4 w-4" strokeWidth={1.75} />
    </span>
  )
}

function fundoSeveridade(severidade: SeveridadeAlerta): string {
  if (severidade === 'critico') return 'border-danger-100 bg-danger-50/50 hover:bg-danger-50'
  if (severidade === 'atencao') return 'border-amber-100 bg-amber-50/50 hover:bg-amber-50'
  if (severidade === 'sucesso') return 'border-success-100 bg-success-50/50 hover:bg-success-50'
  return 'border-info-100 bg-info-50/50 hover:bg-info-50'
}

function badgeSeveridade(severidade: SeveridadeAlerta) {
  if (severidade === 'critico') return 'danger' as const
  if (severidade === 'atencao') return 'amber' as const
  if (severidade === 'sucesso') return 'success' as const
  return 'info' as const
}
