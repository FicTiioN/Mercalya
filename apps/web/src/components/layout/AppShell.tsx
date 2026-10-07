import { useCallback, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useToast } from '@/components/ui/toast-context'
import { useAtalhos } from '@/lib/useAtalhos'
import { useLojaAtual } from '@/lib/useLojaAtual'
import { AppSession } from '@/services'
import { AtalhosDialog } from './AjudaMenu'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'

export function AppShell() {
  const { pathname } = useLocation()
  const toast = useToast()
  const [menuAberto, setMenuAberto] = useState(false)
  const [atalhosAbertos, setAtalhosAbertos] = useState(false)

  const usuario = AppSession.usuarioAtual()
  // Trocar de loja remonta a página: cada tela recarrega os dados da loja nova
  // sem precisar saber que existe um seletor.
  const lojaId = useLojaAtual()

  const abrirAtalhos = useCallback(() => setAtalhosAbertos(true), [])
  useAtalhos(abrirAtalhos)

  return (
    <div className="min-h-screen bg-bg">
      {/* Sidebar fixa: permanece visível enquanto o conteúdo rola. */}
      <AppSidebar abertaNoMobile={menuAberto} aoFecharMobile={() => setMenuAberto(false)} />

      {/* O conteúdo é deslocado pela largura da sidebar a partir de lg. */}
      <div className="flex min-h-screen min-w-0 flex-col lg:pl-sidebar">
        <AppHeader
          usuario={usuario}
          aoAbrirMenu={() => setMenuAberto(true)}
          aoAbrirAtalhos={abrirAtalhos}
          aoAvisar={(titulo, descricao) => toast.info(titulo, descricao)}
        />

        <main key={`${pathname}:${lojaId}`} className="min-w-0 flex-1 animate-fade-in">
          <Outlet />
        </main>
      </div>

      <AtalhosDialog aberto={atalhosAbertos} aoFechar={() => setAtalhosAbertos(false)} />

    </div>
  )
}

/** Container padrão de página: padding 32px e coluna de 24px entre blocos. */
export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-6 px-6 py-8 xl:px-8 ${className ?? ''}`}>{children}</div>
  )
}
