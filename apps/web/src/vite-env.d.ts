/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  /** Provedor que o totem aciona ao pagar. Sem valor, a maquininha simulada. */
  readonly VITE_PROVEDOR_PAGAMENTO?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
