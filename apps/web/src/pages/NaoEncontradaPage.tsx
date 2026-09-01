import { Compass } from 'lucide-react'
import { PageContainer } from '@/components/layout/AppShell'
import { SectionCard } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/Feedback'
import { LinkButton } from '@/components/ui/Button'

export function NaoEncontradaPage() {
  return (
    <PageContainer>
      <SectionCard>
        <EmptyState
          icone={<Compass className="h-7 w-7" strokeWidth={1.5} />}
          titulo="Página não encontrada"
          descricao="O endereço acessado não existe no Mercalya. Volte ao início para retomar o fluxo recomendado."
          acao={<LinkButton to="/inicio">Ir para o Início</LinkButton>}
        />
      </SectionCard>
    </PageContainer>
  )
}
