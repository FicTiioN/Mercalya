import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Skeleton } from './Feedback'

export interface ColunaTabela<T> {
  chave: string
  cabecalho: ReactNode
  render: (item: T, indice: number) => ReactNode
  /** Largura fixa opcional, ex.: '96px'. */
  largura?: string
  alinhamento?: 'left' | 'right' | 'center'
  className?: string
  classeCabecalho?: string
}

export interface DataTableProps<T> {
  colunas: Array<ColunaTabela<T>>
  itens: T[]
  chaveDe: (item: T) => string
  carregando?: boolean
  linhasEsqueleto?: number
  vazio?: ReactNode
  aoClicarLinha?: (item: T) => void
  linhaSelecionada?: (item: T) => boolean
  className?: string
  /** Linhas mais compactas para tabelas densas (Loja, listas do Painel). */
  densa?: boolean
}

export function DataTable<T>({
  colunas,
  itens,
  chaveDe,
  carregando,
  linhasEsqueleto = 6,
  vazio,
  aoClicarLinha,
  linhaSelecionada,
  className,
  densa,
}: DataTableProps<T>) {
  const alinhar = (a?: 'left' | 'right' | 'center') =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left'

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr className="mc-table-head">
            {colunas.map((coluna) => (
              <th
                key={coluna.chave}
                style={coluna.largura ? { width: coluna.largura } : undefined}
                className={cn(
                  'whitespace-nowrap px-4 py-3 font-medium',
                  alinhar(coluna.alinhamento),
                  coluna.classeCabecalho,
                )}
              >
                {coluna.cabecalho}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {carregando &&
            Array.from({ length: linhasEsqueleto }).map((_, i) => (
              <tr key={`sk-${i}`} className="border-b border-line last:border-0">
                {colunas.map((coluna) => (
                  <td key={coluna.chave} className={cn('px-4', densa ? 'py-3' : 'py-4')}>
                    <Skeleton className={cn('h-4', i % 3 === 0 ? 'w-3/4' : 'w-1/2')} />
                  </td>
                ))}
              </tr>
            ))}

          {!carregando && itens.length === 0 && (
            <tr>
              <td colSpan={colunas.length} className="px-4 py-0">
                {vazio}
              </td>
            </tr>
          )}

          {!carregando &&
            itens.map((item, indice) => {
              const selecionada = linhaSelecionada?.(item) ?? false
              return (
                <tr
                  key={chaveDe(item)}
                  onClick={aoClicarLinha ? () => aoClicarLinha(item) : undefined}
                  className={cn(
                    'border-b border-line transition-colors last:border-0',
                    aoClicarLinha && 'cursor-pointer',
                    selecionada ? 'bg-teal-50/70' : aoClicarLinha && 'hover:bg-surface-2/60',
                  )}
                >
                  {colunas.map((coluna) => (
                    <td
                      key={coluna.chave}
                      className={cn(
                        'px-4 align-middle text-body text-ink',
                        densa ? 'py-3' : 'py-3.5',
                        alinhar(coluna.alinhamento),
                        coluna.className,
                      )}
                    >
                      {coluna.render(item, indice)}
                    </td>
                  ))}
                </tr>
              )
            })}
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Paginação                                                           */
/* ------------------------------------------------------------------ */

export interface PaginationProps {
  pagina: number
  totalPaginas: number
  total: number
  porPagina: number
  aoMudarPagina: (pagina: number) => void
  aoMudarPorPagina?: (porPagina: number) => void
  rotuloItem?: string
  className?: string
}

export function Pagination({
  pagina,
  totalPaginas,
  total,
  porPagina,
  aoMudarPagina,
  aoMudarPorPagina,
  rotuloItem = 'itens',
  className,
}: PaginationProps) {
  const inicio = total === 0 ? 0 : (pagina - 1) * porPagina + 1
  const fim = Math.min(pagina * porPagina, total)

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-4 border-t border-line px-5 py-4',
        className,
      )}
    >
      <p className="text-caption text-muted">
        Mostrando {inicio} a {fim} de {total.toLocaleString('pt-BR')} {rotuloItem}
      </p>

      <div className="flex items-center gap-3">
        <nav className="flex items-center gap-1.5">
          <BotaoPagina
            aoClicar={() => aoMudarPagina(pagina - 1)}
            desabilitado={pagina <= 1}
            rotulo="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </BotaoPagina>

          {gerarPaginas(pagina, totalPaginas).map((p, i) =>
            p === '...' ? (
              <span key={`gap-${i}`} className="px-1 text-caption text-muted">
                ...
              </span>
            ) : (
              <BotaoPagina
                key={p}
                aoClicar={() => aoMudarPagina(p)}
                ativo={p === pagina}
                rotulo={`Página ${p}`}
              >
                {p}
              </BotaoPagina>
            ),
          )}

          <BotaoPagina
            aoClicar={() => aoMudarPagina(pagina + 1)}
            desabilitado={pagina >= totalPaginas}
            rotulo="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </BotaoPagina>
        </nav>

        {aoMudarPorPagina && (
          <select
            value={porPagina}
            onChange={(e) => aoMudarPorPagina(Number(e.target.value))}
            className="h-9 cursor-pointer rounded-md border border-line bg-surface px-2.5 text-caption text-ink mc-focus"
            aria-label="Itens por página"
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n} por página
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}

function BotaoPagina({
  children,
  aoClicar,
  ativo,
  desabilitado,
  rotulo,
}: {
  children: ReactNode
  aoClicar: () => void
  ativo?: boolean
  desabilitado?: boolean
  rotulo: string
}) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      aria-current={ativo ? 'page' : undefined}
      onClick={aoClicar}
      disabled={desabilitado}
      className={cn(
        'flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-label font-medium transition-colors',
        ativo
          ? 'border-teal bg-teal text-white'
          : 'border-line bg-surface text-ink hover:bg-surface-2',
        desabilitado && 'cursor-not-allowed opacity-45 hover:bg-surface',
      )}
    >
      {children}
    </button>
  )
}

function gerarPaginas(atual: number, total: number): Array<number | '...'> {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)

  const paginas: Array<number | '...'> = []
  const janelaInicio = Math.max(1, Math.min(atual - 1, total - 3))
  const janelaFim = Math.min(total, janelaInicio + 2)

  for (let p = janelaInicio; p <= janelaFim; p += 1) paginas.push(p)
  if (janelaFim < total - 1) paginas.push('...')
  if (janelaFim < total) paginas.push(total)

  return paginas
}
