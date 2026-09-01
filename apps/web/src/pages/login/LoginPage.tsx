import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, CircleCheckBig, Crosshair, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { cn } from '@/lib/cn'
import { LogoClara, LogoCompacta } from '@/components/layout/Logo'
import { Button } from '@/components/ui/Button'
import { FormField, Input } from '@/components/ui/Form'
import { useToast } from '@/components/ui/toast-context'
import { AuthService } from '@/services'

const pilares = [
  {
    icone: Crosshair,
    titulo: 'Controle',
    descricao: 'Tenha controle total das vendas, do estoque e das operações.',
  },
  {
    icone: BarChart3,
    titulo: 'Clareza',
    descricao: 'Informações claras para decisões melhores.',
  },
  {
    icone: CircleCheckBig,
    titulo: 'Simplicidade',
    descricao: 'Tudo o que você precisa, sem complicação.',
  },
]

const DEMO = { email: 'admin@mercalya.com.br', senha: 'mercalya' }

export function LoginPage() {
  const navegar = useNavigate()
  const local = useLocation()
  const toast = useToast()

  // Volta para a pagina que o usuario tentou abrir antes de ser barrado.
  const destino = (local.state as { de?: string } | null)?.de ?? '/inicio'

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [lembrar, setLembrar] = useState(true)
  const [entrando, setEntrando] = useState(false)
  const [erros, setErros] = useState<{ email?: string; senha?: string }>({})

  const autenticar = async (credenciais: { email: string; senha: string }) => {
    setEntrando(true)
    try {
      await AuthService.entrar(credenciais.email, credenciais.senha)
      navegar(destino, { replace: true })
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : 'Não foi possível entrar.'
      // A API não diz se o errado foi o e-mail ou a senha — de propósito.
      // Marcar só o campo da senha ajudaria a descobrir quais e-mails existem.
      setErros({ senha: mensagem })
      toast.erro('Não foi possível entrar', mensagem)
      setEntrando(false)
    }
  }

  const entrar = async (evento: FormEvent) => {
    evento.preventDefault()

    const novos: { email?: string; senha?: string } = {}
    if (!email.trim()) novos.email = 'Informe seu e-mail.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) novos.email = 'E-mail inválido.'
    if (!senha) novos.senha = 'Informe sua senha.'
    setErros(novos)
    if (Object.keys(novos).length > 0) return

    await autenticar({ email: email.trim(), senha })
  }

  return (
    <div className="min-h-screen bg-bg lg:grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
      {/* ------------------------------ painel da marca ----------------------- */}
      <aside className="relative hidden overflow-hidden bg-[#062A2B] px-12 py-14 lg:flex lg:flex-col lg:justify-center xl:px-16">
        <Ornamentos />

        <div className="relative z-10 max-w-[420px]">
          <LogoClara largura={210} />

          <p className="mt-10 text-[15px] font-semibold uppercase leading-[1.55] tracking-[0.14em] text-teal-600">
            Gestão inteligente
            <br />
            para o novo varejo.
          </p>

          <p className="mt-6 max-w-[380px] text-[15px] leading-relaxed text-white/70">
            A Mercalya conecta vendas, estoque, compras e operações em um só lugar, com clareza
            e eficiência para o crescimento do seu negócio.
          </p>

          <ul className="mt-10">
            {pilares.map((pilar) => {
              const Icone = pilar.icone
              return (
                <li
                  key={pilar.titulo}
                  className="flex items-start gap-5 border-t border-white/10 py-6 first:border-t-0 first:pt-0"
                >
                  <Icone
                    className="mt-0.5 h-8 w-8 shrink-0 text-teal-600"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="text-label font-semibold uppercase tracking-[0.1em] text-teal-600">
                      {pilar.titulo}
                    </p>
                    <p className="mt-1.5 max-w-[280px] text-body leading-relaxed text-white/70">
                      {pilar.descricao}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </aside>

      {/* -------------------------------- formulário -------------------------- */}
      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-[496px]">
          <form
            onSubmit={entrar}
            noValidate
            className="rounded-2xl border border-line bg-surface px-8 py-11 shadow-card sm:px-12"
          >
            <div className="flex flex-col items-center text-center">
              <LogoCompacta escala={1.15} />
              <h1 className="mt-6 font-display text-[26px] font-bold tracking-[-0.02em] text-ink">
                Entrar na Mercalya
              </h1>
              <p className="mt-2 text-body text-muted">
                Acesse sua operação em poucos segundos.
              </p>
            </div>

            <div className="mt-8 space-y-5">
              <FormField label="E-mail" erro={erros.email} htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setErros((x) => ({ ...x, email: undefined }))
                  }}
                  placeholder="seu@email.com"
                  erro={Boolean(erros.email)}
                  iconeEsquerda={<Mail className="h-4 w-4" strokeWidth={1.75} />}
                />
              </FormField>

              <FormField label="Senha" erro={erros.senha} htmlFor="senha">
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <input
                    id="senha"
                    type={verSenha ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={senha}
                    onChange={(e) => {
                      setSenha(e.target.value)
                      setErros((x) => ({ ...x, senha: undefined }))
                    }}
                    placeholder="Digite sua senha"
                    className={cn(
                      'mc-input pl-10 pr-11',
                      erros.senha && 'border-danger focus-visible:border-danger',
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setVerSenha((v) => !v)}
                    aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    {verSenha ? (
                      <EyeOff className="h-4.5 w-4.5" strokeWidth={1.75} />
                    ) : (
                      <Eye className="h-4.5 w-4.5" strokeWidth={1.75} />
                    )}
                  </button>
                </div>
              </FormField>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2.5 text-body text-ink">
                  <input
                    type="checkbox"
                    checked={lembrar}
                    onChange={(e) => setLembrar(e.target.checked)}
                    className="h-[18px] w-[18px] cursor-pointer rounded-sm border-line text-teal accent-teal mc-focus"
                  />
                  Lembrar de mim
                </label>

                <button
                  type="button"
                  onClick={() =>
                    toast.info(
                      'Recuperação de senha',
                      'O envio do link será conectado junto com a API.',
                    )
                  }
                  className="rounded text-label font-medium text-teal transition-colors hover:text-teal-dark"
                >
                  Esqueci minha senha
                </button>
              </div>
            </div>

            <div className="mt-7 space-y-3">
              <Button type="submit" blocoCompleto tamanho="lg" carregando={entrando}>
                Entrar
              </Button>
              <Button
                type="button"
                variante="outline"
                blocoCompleto
                tamanho="lg"
                className="border-teal/40 text-teal hover:bg-teal-50"
                onClick={() => {
                  setEmail(DEMO.email)
                  setSenha(DEMO.senha)
                  setErros({})
                  void autenticar(DEMO)
                }}
              >
                Acessar demonstração
              </Button>
            </div>

            <div className="my-6 flex items-center gap-4">
              <span className="h-px flex-1 bg-line" aria-hidden />
              <span className="text-caption text-muted">ou</span>
              <span className="h-px flex-1 bg-line" aria-hidden />
            </div>

            <p className="text-center text-body text-muted">
              Ainda não tem acesso?{' '}
              <button
                type="button"
                onClick={() =>
                  toast.info('Fale com nossa equipe', 'O canal comercial chega com a API.')
                }
                className="rounded font-medium text-teal transition-colors hover:text-teal-dark"
              >
                Fale com nossa equipe
              </button>
            </p>
          </form>

          <p className="mt-8 text-center text-caption text-muted">
            © {new Date().getFullYear()} Mercalya. Todos os direitos reservados.
          </p>
        </div>
      </main>
    </div>
  )
}

/** Grafismos discretos do painel escuro: traçado de circuito e malha de pontos. */
function Ornamentos() {
  return (
    <>
      <svg
        className="pointer-events-none absolute -right-10 -top-10 h-[360px] w-[360px] text-teal/25"
        viewBox="0 0 200 200"
        fill="none"
        aria-hidden
      >
        <path
          d="M120 0v34a12 12 0 0 0 12 12h56M150 0v14a12 12 0 0 0 12 12h38M96 200v-40a12 12 0 0 1 12-12h44a12 12 0 0 0 12-12V78"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <rect x="150" y="60" width="44" height="34" rx="8" stroke="currentColor" strokeWidth="1.5" />
      </svg>

      <svg
        className="pointer-events-none absolute -bottom-6 left-0 h-[220px] w-[260px] text-teal/20"
        aria-hidden
      >
        <defs>
          <pattern id="malha-login" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.6" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#malha-login)" />
      </svg>

      <span
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[#04191A]"
        aria-hidden
      />
    </>
  )
}
