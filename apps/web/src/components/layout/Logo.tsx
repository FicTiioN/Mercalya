import { cn } from '@/lib/cn'

/**
 * A marca é a imagem oficial, não um redesenho.
 *
 * Os arquivos vêm de `references/logo` e passaram por três tratamentos antes
 * de virarem `public/marca/ui-*.png`: o fundo foi removido com alfa
 * proporcional na borda (para o antialias não virar franja), a arte foi
 * recortada ao conteúdo e reamostrada para o tamanho de uso. Os originais
 * pesavam de 250KB a 1MB — grande demais para um elemento presente em toda
 * tela; estes ficaram entre 6KB e 143KB.
 *
 * `width`/`height` são declarados em toda imagem: sem eles o navegador não
 * reserva o espaço e a sidebar salta quando a marca carrega.
 */

const SIMBOLO = { src: '/marca/ui-simbolo.png', w: 256, h: 225 }
const HORIZONTAL = { src: '/marca/ui-horizontal.png', w: 560, h: 126 }
const VERTICAL = { src: '/marca/ui-vertical.png', w: 420, h: 408 }
const VERTICAL_CLARA = { src: '/marca/ui-vertical-claro.png', w: 560, h: 413 }

/** Só o símbolo. Usado onde não cabe o nome — telas de espera, avatares. */
export function Monograma({ tamanho = 26 }: { tamanho?: number }) {
  return (
    <img
      src={SIMBOLO.src}
      width={tamanho}
      height={Math.round((tamanho / SIMBOLO.w) * SIMBOLO.h)}
      alt=""
      // Decorativo: onde aparece, o nome da tela já identifica o contexto.
      aria-hidden
      draggable={false}
    />
  )
}

/**
 * Marca empilhada com a tagline — a versão principal, usada no topo da
 * sidebar. O nome e a assinatura fazem parte da imagem: são a tipografia da
 * marca, não texto recomposto.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <img
      src={VERTICAL.src}
      width={140}
      height={Math.round((140 / VERTICAL.w) * VERTICAL.h)}
      alt="Mercalya"
      className={cn('h-auto w-[140px]', className)}
      draggable={false}
    />
  )
}

/**
 * Versão horizontal, para quando a altura é curta: cabeçalho do card de login
 * e sidebar em telas pequenas.
 */
export function LogoCompacta({
  className,
  escala = 1,
}: {
  className?: string
  escala?: number
}) {
  const largura = Math.round(150 * escala)
  return (
    <img
      src={HORIZONTAL.src}
      width={largura}
      height={Math.round((largura / HORIZONTAL.w) * HORIZONTAL.h)}
      alt="Mercalya"
      className={cn('h-auto', className)}
      style={{ width: largura }}
      draggable={false}
    />
  )
}

/**
 * Versão em branco, para fundos escuros.
 *
 * É empilhada porque é assim que a marca existe nessa cor — não há lockup
 * horizontal claro entre as referências, e achatar a versão colorida daria
 * uma marca que a Mercalya não tem.
 */
export function LogoClara({
  className,
  largura = 200,
}: {
  className?: string
  largura?: number
}) {
  return (
    <img
      src={VERTICAL_CLARA.src}
      width={largura}
      height={Math.round((largura / VERTICAL_CLARA.w) * VERTICAL_CLARA.h)}
      alt="Mercalya"
      className={cn('h-auto', className)}
      style={{ width: largura }}
      draggable={false}
    />
  )
}
