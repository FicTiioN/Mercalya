import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AuthService } from '@/services'
import { Monograma } from '@/components/layout/Logo'
import { Button } from '@/components/ui/Button'

type Estado = 'verificando' | 'autenticado' | 'sem-sessao' | 'api-fora'

/**
 * Porteiro das rotas do app.
 *
 * Ter token guardado não é o mesmo que ter sessão válida — por isso confirma
 * com a API antes de liberar. E distingue **sem sessão** (vai para o login) de
 * **API fora do ar** (mostra o erro e oferece tentar de novo): mandar para o
 * login quando o problema é a API só faz o usuário digitar a senha à toa.
 */
export function RotaProtegida({ children }: { children: React.ReactNode }) {
  const local = useLocation()
  const [estado, setEstado] = useState<Estado>('verificando')
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    let cancelado = false

    if (!AuthService.temToken()) {
      setEstado('sem-sessao')
      return
    }

    setEstado('verificando')
    AuthService.carregarSessao()
      .then((sessao) => {
        if (cancelado) return
        setEstado(sessao ? 'autenticado' : 'sem-sessao')
      })
      .catch(() => {
        if (!cancelado) setEstado('api-fora')
      })

    return () => {
      cancelado = true
    }
  }, [tentativa])

  if (estado === 'verificando') return <TelaDeEspera />

  if (estado === 'api-fora') {
    return (
      <TelaDeEspera
        titulo="Não foi possível falar com o servidor"
        descricao="A API parece estar fora do ar. Sua sessão continua válida."
        acao={
          <Button variante="outline" onClick={() => setTentativa((n) => n + 1)}>
            Tentar novamente
          </Button>
        }
      />
    )
  }

  if (estado === 'sem-sessao') {
    // Guarda a rota pretendida para voltar a ela depois do login.
    return <Navigate to="/login" replace state={{ de: local.pathname + local.search }} />
  }

  return <>{children}</>
}

function TelaDeEspera({
  titulo,
  descricao,
  acao,
}: {
  titulo?: string
  descricao?: string
  acao?: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
      <Monograma tamanho={44} />
      {titulo ? (
        <>
          <p className="font-display text-card-title font-semibold text-ink">{titulo}</p>
          {descricao && <p className="max-w-[420px] text-body text-muted">{descricao}</p>}
          {acao && <div className="mt-1">{acao}</div>}
        </>
      ) : (
        <p className="text-body text-muted">Carregando sua sessão...</p>
      )}
    </div>
  )
}
