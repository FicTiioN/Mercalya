const moedaFmt = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const numeroFmt = new Intl.NumberFormat('pt-BR')

const decimalFmt = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function moeda(valor: number): string {
  return moedaFmt.format(valor)
}

/** "R$ 52.843,60" -> "52.843,60" (para composições com o símbolo separado) */
export function moedaCurta(valor: number): string {
  if (Math.abs(valor) >= 1_000_000) {
    return `R$ ${decimalFmt.format(valor / 1_000_000)} mi`
  }
  return moedaFmt.format(valor)
}

export function numero(valor: number): string {
  return numeroFmt.format(valor)
}

export function decimal(valor: number): string {
  return decimalFmt.format(valor)
}

export function percentual(valor: number, casas = 1): string {
  return `${valor.toFixed(casas).replace('.', ',')}%`
}

export function data(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR')
}

export function dataHora(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

export function hora(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/** "Hoje, 09:28" / "Ontem, 17:32" / "22/05/2024" */
export function quando(iso: string): string {
  const d = new Date(iso)
  const agora = new Date()
  const dia = 24 * 60 * 60 * 1000
  const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime()
  const t = d.getTime()
  if (t >= inicioHoje) return `Hoje, ${hora(iso)}`
  if (t >= inicioHoje - dia) return `Ontem, ${hora(iso)}`
  return dataHora(iso)
}

export function diasEntre(alvoIso: string, base = new Date()): number {
  const alvo = new Date(alvoIso.length <= 10 ? `${alvoIso}T12:00:00` : alvoIso)
  const diff = alvo.getTime() - base.getTime()
  return Math.ceil(diff / (24 * 60 * 60 * 1000))
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase()
}

export function delta(valor: number): { texto: string; positivo: boolean; neutro: boolean } {
  const neutro = Math.abs(valor) < 0.05
  return {
    texto: `${valor > 0 ? '↑' : valor < 0 ? '↓' : '—'} ${Math.abs(valor)
      .toFixed(1)
      .replace('.', ',')}%`,
    positivo: valor > 0,
    neutro,
  }
}

export function apenasDigitos(valor: string): string {
  return valor.replace(/\D+/g, '')
}

export function mascaraCnpjCpf(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 14)
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2')
  }
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function mascaraTelefone(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11)
  if (d.length <= 10) {
    return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  }
  return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

export function mascaraCep(valor: string): string {
  return apenasDigitos(valor).slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2')
}

export function paraNumero(valor: string): number {
  const limpo = valor.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')
  const n = Number(limpo)
  return Number.isFinite(n) ? n : 0
}
