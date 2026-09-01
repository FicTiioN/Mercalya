/**
 * Reexporta o dominio compartilhado (`packages/domain`), que tambem sera'
 * consumido pela API e pelo mobile. As telas continuam importando de
 * `@/models`, entao a origem dos tipos pode mudar sem tocar em cada arquivo.
 *
 * Tipos que forem exclusivos da web (estado de UI, props de tela) ficam aqui,
 * nunca no pacote compartilhado.
 */
export * from '@mercalya/domain'
