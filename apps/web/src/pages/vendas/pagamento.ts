import { Banknote, CreditCard, QrCode, type LucideIcon } from 'lucide-react'
import type { FormaPagamentoVenda } from '@/models'

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
