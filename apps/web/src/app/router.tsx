import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { InicioPage } from '@/pages/inicio/InicioPage'
import { PainelGerencialPage } from '@/pages/painel/PainelGerencialPage'
import { ProdutosPage } from '@/pages/produtos/ProdutosPage'
import { ProdutoFormPage } from '@/pages/produtos/ProdutoFormPage'
import { FornecedoresPage } from '@/pages/fornecedores/FornecedoresPage'
import { FornecedorFormPage } from '@/pages/fornecedores/FornecedorFormPage'
import { ComprasPage } from '@/pages/compras/ComprasPage'
import { NovaCompraPage } from '@/pages/compras/NovaCompraPage'
import { CompraDetalhePage } from '@/pages/compras/CompraDetalhePage'
import { EstoqueCentralPage } from '@/pages/estoque/EstoqueCentralPage'
import { AbastecimentoPage } from '@/pages/abastecimento/AbastecimentoPage'
import { LojaPage } from '@/pages/loja/LojaPage'
import { MovimentacoesPage } from '@/pages/movimentacoes/MovimentacoesPage'
import { PerdasPage } from '@/pages/perdas/PerdasPage'
import { VendasPage } from '@/pages/vendas/VendasPage'
import { VendaDetalhePage } from '@/pages/vendas/VendaDetalhePage'
import { ConfiguracoesPage } from '@/pages/configuracoes/ConfiguracoesPage'
import { LoginPage } from '@/pages/login/LoginPage'
import { NaoEncontradaPage } from '@/pages/NaoEncontradaPage'
import { RotaProtegida } from './RotaProtegida'

export const router = createBrowserRouter([
  // O login fica fora do AppShell: sem sidebar nem header.
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    // Tudo abaixo exige sessao: o porteiro confirma o token com a API antes
    // de montar o shell.
    element: (
      <RotaProtegida>
        <AppShell />
      </RotaProtegida>
    ),
    children: [
      { index: true, element: <Navigate to="/inicio" replace /> },
      { path: 'inicio', element: <InicioPage /> },
      { path: 'painel-gerencial', element: <PainelGerencialPage /> },

      { path: 'cadastros/produtos', element: <ProdutosPage /> },
      { path: 'cadastros/produtos/novo', element: <ProdutoFormPage modo="novo" /> },
      { path: 'cadastros/produtos/:id', element: <ProdutoFormPage modo="edicao" /> },

      { path: 'cadastros/fornecedores', element: <FornecedoresPage /> },
      { path: 'cadastros/fornecedores/novo', element: <FornecedorFormPage modo="novo" /> },
      { path: 'cadastros/fornecedores/:id', element: <FornecedorFormPage modo="edicao" /> },

      { path: 'operacao/compras', element: <ComprasPage /> },
      { path: 'operacao/compras/nova', element: <NovaCompraPage /> },
      { path: 'operacao/compras/:id', element: <CompraDetalhePage /> },

      { path: 'operacao/estoque-central', element: <EstoqueCentralPage /> },
      { path: 'operacao/abastecimento', element: <AbastecimentoPage /> },
      { path: 'operacao/loja', element: <LojaPage /> },
      { path: 'operacao/movimentacoes', element: <MovimentacoesPage /> },
      { path: 'operacao/perdas-ajustes', element: <PerdasPage /> },

      { path: 'vendas', element: <VendasPage /> },
      { path: 'vendas/:id', element: <VendaDetalhePage /> },
      { path: 'configuracoes', element: <ConfiguracoesPage /> },

      { path: '*', element: <NaoEncontradaPage /> },
    ],
  },
])
