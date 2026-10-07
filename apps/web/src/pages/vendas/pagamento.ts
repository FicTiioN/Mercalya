import { Banknote, CreditCard, QrCode, type LucideIcon } from 'lucide-react'
import type { FormaPagamentoVenda, Pagamento, Venda } from '@/models'

/**
 * O pagamento que representa a venda quando só cabe um: o aprovado de maior
 * valor. Sem nenhum aprovado (venda recusada), o de maior valor entre todos —
 * a listagem ainda precisa dizer "tentou pagar no cartão".
 */
export function pagamentoPrincipal(venda: Pick<Venda, 'pagamentos'>): Pagamento | null {
  if (venda.pagamentos.length === 0) return null
  const efetivos = venda.pagamentos.filter(
    (p) => p.status === 'aprovado' || p.status === 'estornado',
  )
  const base = efetivos.length > 0 ? efetivos : venda.pagamentos
  return base.reduce((maior, p) => (p.valor > maior.valor ? p : maior))
}

/** Ícone e cor de cada forma de pagamento, como nas referências de vendas. */
export const VISUAL_PAGAMENTO: Record<
  FormaPagamentoVenda,
  { icone: LucideIcon; classe: string }
> = {
  pix: { icone: QrCode, classe: 'text-teal' },
  dinheiro: { icone: Banknote, classe: 'text-success' },
  'cartao-debito': { icone: CreditCard, classe: 'text-info' },
  'cartao-credito': { icone: CreditCard, classe: 'text-[#D68A0F]' },
}
