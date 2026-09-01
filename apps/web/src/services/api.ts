/**
 * Erro de negócio.
 *
 * Distingue "a regra não permite" de "algo falhou": o primeiro vira mensagem
 * na tela, o segundo vira erro técnico. A API responde 409 para regra violada
 * e 400 para validação de campo, e `chamada.ts` converte os dois para cá.
 *
 * Este arquivo já abrigou a camada de transporte simulada (`simular`,
 * `paginar`, `contem`) da fase sem backend. Todos os Services passaram para
 * `http.ts`, e o que sobrou é só isto.
 */
export class ErroDeNegocio extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = 'ErroDeNegocio'
  }
}
