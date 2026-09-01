/**
 * Normalização de texto para busca — a mesma regra que o frontend aplicava em
 * memória, agora persistida na coluna `produto.busca_texto`.
 *
 * Sem isso, `ILIKE '%acucar%'` não encontraria "Açúcar": o Postgres compara
 * bytes, e "ç" não é "c". Guardar o texto já normalizado resolve sem depender
 * de extensão do banco e mantém o índice utilizável.
 */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

/** Campos que a busca de produtos cobre: nome, EAN e SKU. */
export function textoDeBusca(partes: {
  nome: string
  ean?: string | null
  sku?: string | null
}): string {
  return normalizar([partes.nome, partes.ean ?? '', partes.sku ?? ''].join(' ').trim())
}

/** Campos que a busca de fornecedores cobre. */
export function textoDeBuscaFornecedor(partes: {
  nome: string
  nomeFantasia?: string | null
  documento?: string | null
  contato?: { nome?: string | null } | null
  contatoNome?: string | null
}): string {
  return normalizar(
    [
      partes.nome,
      partes.nomeFantasia ?? '',
      partes.documento ?? '',
      partes.contato?.nome ?? partes.contatoNome ?? '',
    ]
      .join(' ')
      .trim(),
  )
}
