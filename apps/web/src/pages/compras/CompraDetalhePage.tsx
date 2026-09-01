import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, Truck, Warehouse } from 'lucide-react'
import { CompraService, FornecedorService, ProdutoService } from '@/services'
import { useRecurso } from '@/lib/useRecurso'
import { data as formatarData, moeda, numero } from '@/lib/format'
import { PageContainer } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, Skeleton } from '@/components/ui/Feedback'
import { ProductAvatar } from '@/components/ui/Misc'

export function CompraDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const navegar = useNavigate()

  const compra = useRecurso(
    async () => (id ? CompraService.obter(id) : null),
    [id],
  )
  const produtos = useRecurso(() => ProdutoService.listarSimples(), [])
  const fornecedores = useRecurso(() => FornecedorService.listarSimples(), [])

  const fornecedor = fornecedores.dados?.find((f) => f.id === compra.dados?.fornecedorId)

  if (compra.erro) {
    return (
      <PageContainer>
        <EmptyState
          icone={<FileText className="h-7 w-7" strokeWidth={1.5} />}
          titulo="Compra não encontrada"
          descricao="A compra que você procura não existe ou foi removida."
          acao={
            <Button variante="outline" onClick={() => navegar('/operacao/compras')}>
              Voltar para compras
            </Button>
          }
        />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        migalhas={[
          { label: 'Operação' },
          { label: 'Compras', to: '/operacao/compras' },
          { label: compra.dados?.numero ?? 'Detalhe' },
        ]}
        titulo={compra.dados ? `Compra ${compra.dados.numero}` : 'Compra'}
        descricao="Detalhes da entrada registrada no estoque central."
        acoes={
          <Button
            variante="outline"
            iconeEsquerda={<ArrowLeft className="h-4 w-4" strokeWidth={1.75} />}
            onClick={() => navegar('/operacao/compras')}
          >
            Voltar
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-6">
          <SectionCard titulo="Dados da compra" classeCorpo="pt-4">
            {compra.carregando || !compra.dados ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (
              <dl className="grid grid-cols-2 gap-5 md:grid-cols-4">
                <Campo rotulo="Fornecedor" valor={fornecedor?.nome ?? '—'} />
                <Campo rotulo="Nota fiscal" valor={`NF ${compra.dados.notaFiscal}`} />
                <Campo rotulo="Emissão" valor={formatarData(compra.dados.dataEmissao)} />
                <Campo rotulo="Entrada" valor={formatarData(compra.dados.dataEntrada)} />
                <Campo rotulo="Condição" valor={compra.dados.condicaoPagamento} />
                <Campo rotulo="Forma de pagamento" valor={compra.dados.formaPagamento} />
                <Campo rotulo="Vencimento" valor={formatarData(compra.dados.dataVencimento)} />
                <Campo
                  rotulo="Status"
                  valor={<StatusBadge status={compra.dados.status} />}
                />
              </dl>
            )}
          </SectionCard>

          <SectionCard titulo="Itens recebidos" semPaddingCorpo>
            {compra.carregando || !compra.dados ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse">
                  <thead>
                    <tr className="mc-table-head">
                      <th className="px-4 py-3 font-medium">Produto</th>
                      <th className="px-4 py-3 font-medium">Quantidade</th>
                      <th className="px-4 py-3 font-medium">Custo unitário</th>
                      <th className="px-4 py-3 font-medium">Lote</th>
                      <th className="px-4 py-3 font-medium">Validade</th>
                      <th className="px-4 py-3 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compra.dados.itens.map((item) => {
                      const produto = produtos.dados?.find((p) => p.id === item.produtoId)
                      return (
                        <tr key={item.id} className="border-b border-line last:border-0">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <ProductAvatar imagem={produto?.imagem ?? '📦'} tamanho="sm" />
                              <span className="text-body text-ink">{produto?.nome ?? '—'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-body tabular text-muted">
                            {numero(item.quantidade)} {item.unidade}
                          </td>
                          <td className="px-4 py-3.5 text-body tabular text-muted">
                            {moeda(item.custoUnitario)}
                          </td>
                          <td className="px-4 py-3.5 text-body tabular text-muted">{item.lote}</td>
                          <td className="px-4 py-3.5 text-body tabular text-muted">
                            {item.validade ? formatarData(item.validade) : '—'}
                          </td>
                          <td className="px-4 py-3.5 text-right text-body font-medium tabular text-ink">
                            {moeda(item.total)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <SectionCard titulo="Resumo" classeCorpo="pt-4">
            {compra.dados && (
              <>
                <Linha rotulo="Subtotal" valor={moeda(compra.dados.subtotal)} />
                <Linha rotulo="Frete" valor={moeda(compra.dados.frete)} />
                <Linha rotulo="Desconto" valor={`- ${moeda(compra.dados.desconto)}`} />
                <div className="mt-3 flex items-center justify-between border-t border-line pt-4">
                  <span className="text-body font-medium text-ink">Total</span>
                  <span className="font-display text-[19px] font-semibold tabular text-teal">
                    {moeda(compra.dados.total)}
                  </span>
                </div>
              </>
            )}
          </SectionCard>

          <SectionCard classeCorpo="p-5">
            <p className="flex items-center gap-2 text-label font-medium text-ink">
              <Warehouse className="h-4.5 w-4.5 text-teal" strokeWidth={1.75} />
              Destino da entrada
            </p>
            <p className="mt-2 text-body text-muted">Estoque central</p>
            <p className="mt-3 flex items-start gap-2 text-caption text-muted">
              <Truck className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              Para levar estes produtos à loja, use a tela de Abastecimento.
            </p>
          </SectionCard>
        </aside>
      </div>
    </PageContainer>
  )
}

function Campo({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption text-muted">{rotulo}</dt>
      <dd className="mt-1 truncate text-body text-ink">{valor}</dd>
    </div>
  )
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-body text-muted">{rotulo}</span>
      <span className="text-body font-medium tabular text-ink">{valor}</span>
    </div>
  )
}
