import { ErroDeNegocio } from './api'
import { ErroApi, requisitar } from './http'

/**
 * Ponte entre o transporte HTTP e o erro que as telas já sabem tratar.
 *
 * A API responde 409 para violação de regra de negócio e 400 para validação de
 * campo. Os dois viram `ErroDeNegocio`; falha de rede e 500 continuam sendo
 * erro técnico, porque a ação do usuário é outra.
 */
export async function chamarApi<T>(
  caminho: string,
  opcoes?: { metodo?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; corpo?: unknown },
): Promise<T> {
  try {
    return await requisitar<T>(caminho, opcoes)
  } catch (erro) {
    if (erro instanceof ErroApi && (erro.status === 409 || erro.status === 400)) {
      throw new ErroDeNegocio(erro.message)
    }
    throw erro
  }
}

/** Monta a query string ignorando vazios e valores "todos"/"todas". */
export function montarQuery(
  campos: Record<string, string | number | boolean | undefined>,
): string {
  const params = new URLSearchParams()
  for (const [chave, valor] of Object.entries(campos)) {
    if (valor === undefined || valor === '' || valor === 'todos' || valor === 'todas') continue
    params.set(chave, String(valor))
  }
  const texto = params.toString()
  return texto ? `?${texto}` : ''
}
