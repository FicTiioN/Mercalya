import type { Prisma } from '@prisma/client'

type Decimalish = Prisma.Decimal | number | null | undefined

/**
 * `Decimal` do Prisma para `number` do contrato.
 *
 * A conta acontece em `Decimal` — no banco e nos serviços — justamente porque
 * custo médio ponderado gera dízima e arredondar cedo acumula erro. O `number`
 * é só a forma de transporte: o frontend já formata e compara números, e os
 * valores deste domínio estão muito longe do limite de precisão do double.
 */
export function numero(valor: Decimalish): number {
  if (valor === null || valor === undefined) return 0
  return typeof valor === 'number' ? valor : valor.toNumber()
}

/** Igual a `numero`, mas preserva a ausência de valor (custo ainda não calculado). */
export function numeroOuNulo(valor: Decimalish): number | null {
  if (valor === null || valor === undefined) return null
  return typeof valor === 'number' ? valor : valor.toNumber()
}

/** Data para o ISO string que o contrato usa. */
export function iso(data: Date | null | undefined): string | null {
  return data ? data.toISOString() : null
}
