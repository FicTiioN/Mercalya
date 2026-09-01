import { useState } from 'react'
import { Bell, Building2, Database, Palette, ShieldCheck, User } from 'lucide-react'
import { AppSession } from '@/services'
import { PageContainer } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/Card'
import { CatalogoSection } from './CatalogoSection'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Alert } from '@/components/ui/Feedback'
import { FormField, Input, Select, Toggle } from '@/components/ui/Form'
import { Avatar } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/toast-context'

export function ConfiguracoesPage() {
  const toast = useToast()
  const usuario = AppSession.usuarioAtual()

  const [notificarEstoqueBaixo, setNotificarEstoqueBaixo] = useState(true)
  const [notificarVencimentos, setNotificarVencimentos] = useState(true)
  const [notificarPerdas, setNotificarPerdas] = useState(false)
  const [diasAlertaVencimento, setDiasAlertaVencimento] = useState('7')
  const [diasSemGiro, setDiasSemGiro] = useState('30')

  return (
    <PageContainer>
      <PageHeader
        titulo="Configurações"
        descricao="Ajuste as preferências da sua operação, alertas e dados de demonstração."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard
          icone={<Building2 className="h-5 w-5" strokeWidth={1.75} />}
          titulo="Loja e condomínio"
          classeCorpo="grid grid-cols-1 gap-5 pt-5"
        >
          <FormField label="Condomínio" htmlFor="condominio">
            <Input id="condominio" value={AppSession.condominioAtual()} readOnly disabled />
          </FormField>
          <FormField label="Loja" htmlFor="loja">
            <Input id="loja" value={AppSession.lojaAtual()} readOnly disabled />
          </FormField>
          <FormField label="Fuso horário" htmlFor="fuso">
            <Select
              id="fuso"
              value="america-sao_paulo"
              onChange={() => undefined}
              opcoes={[{ valor: 'america-sao_paulo', label: 'America/São_Paulo (GMT-3)' }]}
            />
          </FormField>
        </SectionCard>

        <CatalogoSection />

        <SectionCard
          icone={<User className="h-5 w-5" strokeWidth={1.75} />}
          titulo="Meu perfil"
          classeCorpo="pt-5"
        >
          <div className="flex items-center gap-3.5 border-b border-line pb-5">
            <Avatar iniciais={usuario.iniciais} tamanho="lg" className="h-14 w-14 text-[17px]" />
            <div className="min-w-0">
              <p className="font-display text-card-title font-semibold text-ink">{usuario.nome}</p>
              <p className="text-caption text-muted">{usuario.funcao}</p>
            </div>
            <Badge tom="teal" className="ml-auto">
              Sessão demo
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-5 pt-5">
            <FormField label="Nome" htmlFor="nome-usuario">
              <Input id="nome-usuario" value={usuario.nome} readOnly disabled />
            </FormField>
            <FormField label="Função" htmlFor="funcao">
              <Input id="funcao" value={usuario.funcao} readOnly disabled />
            </FormField>
          </div>
        </SectionCard>

        <SectionCard
          icone={<Bell className="h-5 w-5" strokeWidth={1.75} />}
          titulo="Alertas e notificações"
          classeCorpo="space-y-4 pt-5"
        >
          <LinhaToggle
            titulo="Estoque baixo"
            descricao="Avisar quando um produto ficar abaixo do estoque mínimo."
            ativo={notificarEstoqueBaixo}
            aoMudar={setNotificarEstoqueBaixo}
          />
          <LinhaToggle
            titulo="Vencimentos próximos"
            descricao="Avisar sobre lotes que estão perto da data de validade."
            ativo={notificarVencimentos}
            aoMudar={setNotificarVencimentos}
          />
          <LinhaToggle
            titulo="Perdas registradas"
            descricao="Receber resumo diário das perdas lançadas na operação."
            ativo={notificarPerdas}
            aoMudar={setNotificarPerdas}
          />

          <div className="grid grid-cols-1 gap-5 border-t border-line pt-5 sm:grid-cols-2">
            <FormField
              label="Alertar vencimento com (dias)"
              helper="Usado nos alertas do Início e do Painel."
              htmlFor="dias-vencimento"
            >
              <Input
                id="dias-vencimento"
                type="number"
                min={1}
                value={diasAlertaVencimento}
                onChange={(e) => setDiasAlertaVencimento(e.target.value)}
              />
            </FormField>
            <FormField
              label="Considerar sem giro após (dias)"
              helper="Critério do indicador 'sem giro'."
              htmlFor="dias-giro"
            >
              <Input
                id="dias-giro"
                type="number"
                min={1}
                value={diasSemGiro}
                onChange={(e) => setDiasSemGiro(e.target.value)}
              />
            </FormField>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              onClick={() =>
                toast.sucesso(
                  'Preferências salvas',
                  'As preferências serão persistidas na API na próxima fase.',
                )
              }
            >
              Salvar preferências
            </Button>
          </div>
        </SectionCard>

        <SectionCard
          icone={<Database className="h-5 w-5" strokeWidth={1.75} />}
          titulo="Como seus dados são guardados"
          classeCorpo="space-y-4 pt-5"
        >
          <Alert
            tom="info"
            titulo="Tudo fica no servidor"
            icone={<ShieldCheck className="h-5 w-5" strokeWidth={1.75} />}
          >
            Produtos, fornecedores, compras, estoque e vendas ficam em banco de dados, isolados
            por empresa. Nada depende deste navegador — entrar de outro dispositivo mostra
            exatamente a mesma operação.
          </Alert>

          <p className="text-body text-muted">
            Cada operação que mexe em estoque é gravada em uma transação: lote, saldo, custo médio
            e movimentação valem juntos ou nenhum vale. É o que mantém o estoque e o histórico
            sempre coerentes entre si.
          </p>
        </SectionCard>

        <SectionCard
          icone={<Palette className="h-5 w-5" strokeWidth={1.75} />}
          titulo="Aparência"
          classeCorpo="pt-5"
          className="lg:col-span-2"
        >
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex flex-wrap gap-2.5">
              {[
                { nome: 'Mercalya Teal', cor: '#087F73' },
                { nome: 'Teal Dark', cor: '#066A61' },
                { nome: 'Amber', cor: '#F4A629' },
                { nome: 'Ink', cor: '#17232D' },
                { nome: 'Success', cor: '#18A66A' },
                { nome: 'Warning', cor: '#F5A623' },
                { nome: 'Error', cor: '#E5484D' },
                { nome: 'Info', cor: '#3979E9' },
              ].map((token) => (
                <div key={token.nome} className="w-[104px]">
                  <div
                    className="h-12 w-full rounded-lg border border-line"
                    style={{ backgroundColor: token.cor }}
                    aria-hidden
                  />
                  <p className="mt-1.5 truncate text-caption text-ink">{token.nome}</p>
                  <p className="truncate text-caption tabular text-muted">{token.cor}</p>
                </div>
              ))}
            </div>
            <p className="min-w-[220px] flex-1 text-caption text-muted">
              A paleta é definida pelo Design System oficial da Mercalya e centralizada em tokens
              (<code className="rounded bg-surface-2 px-1 py-0.5">tailwind.config.js</code> e{' '}
              <code className="rounded bg-surface-2 px-1 py-0.5">src/index.css</code>). Nenhuma
              página define cores próprias.
            </p>
          </div>
        </SectionCard>
      </div>

    </PageContainer>
  )
}

function LinhaToggle({
  titulo,
  descricao,
  ativo,
  aoMudar,
}: {
  titulo: string
  descricao: string
  ativo: boolean
  aoMudar: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-label font-medium text-ink">{titulo}</p>
        <p className="mt-0.5 text-caption text-muted">{descricao}</p>
      </div>
      <Toggle ativo={ativo} aoMudar={aoMudar} />
    </div>
  )
}
