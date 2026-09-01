import {
  Boxes,
  ChartColumnBig,
  Home,
  Package,
  RefreshCcw,
  Settings,
  ShoppingCart,
  Store,
  Truck,
  TriangleAlert,
  Users,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'

export interface ItemNavegacao {
  rotulo: string
  rota: string
}

export type EntradaNavegacao =
  | { tipo: 'link'; chave: string; rotulo: string; rota: string; icone: LucideIcon }
  | {
      tipo: 'grupo'
      chave: string
      rotulo: string
      icone: LucideIcon
      /** Prefixo de rota usado para saber se o grupo contém a página atual. */
      prefixo: string
      itens: ItemNavegacao[]
    }

/**
 * Estrutura canônica da sidebar (regra 4 do documento de requisitos).
 * As variações de subitens vistas em referências antigas foram descartadas.
 */
export const navegacao: EntradaNavegacao[] = [
  { tipo: 'link', chave: 'inicio', rotulo: 'Início', rota: '/inicio', icone: Home },
  {
    tipo: 'link',
    chave: 'painel',
    rotulo: 'Painel gerencial',
    rota: '/painel-gerencial',
    icone: ChartColumnBig,
  },
  {
    tipo: 'grupo',
    chave: 'cadastros',
    rotulo: 'Cadastros',
    icone: Boxes,
    prefixo: '/cadastros',
    itens: [
      { rotulo: 'Produtos', rota: '/cadastros/produtos' },
      { rotulo: 'Fornecedores', rota: '/cadastros/fornecedores' },
    ],
  },
  {
    tipo: 'grupo',
    chave: 'operacao',
    rotulo: 'Operação',
    icone: Truck,
    prefixo: '/operacao',
    itens: [
      { rotulo: 'Compras', rota: '/operacao/compras' },
      { rotulo: 'Estoque central', rota: '/operacao/estoque-central' },
      { rotulo: 'Abastecimento', rota: '/operacao/abastecimento' },
      { rotulo: 'Loja', rota: '/operacao/loja' },
      { rotulo: 'Movimentações', rota: '/operacao/movimentacoes' },
      { rotulo: 'Perdas e ajustes', rota: '/operacao/perdas-ajustes' },
    ],
  },
  { tipo: 'link', chave: 'vendas', rotulo: 'Vendas', rota: '/vendas', icone: ShoppingCart },
  {
    tipo: 'link',
    chave: 'configuracoes',
    rotulo: 'Configurações',
    rota: '/configuracoes',
    icone: Settings,
  },
]

/** Ícones reutilizados pelas páginas (uma única biblioteca: lucide). */
export const iconesEtapa: Record<string, LucideIcon> = {
  package: Package,
  users: Users,
  'shopping-cart': ShoppingCart,
  warehouse: Warehouse,
  store: Store,
  'shopping-bag': Store,
  refresh: RefreshCcw,
  alerta: TriangleAlert,
}
