import { useLayoutEffect, useRef } from 'react'

/**
 * Título que encoge hasta caber en una sola línea: se mide el texto y se baja el
 * tamaño de letra mientras desborde. Así los nombres largos no se parten ni
 * obligan a reservar una segunda línea que deja hueco a los cortos.
 *
 * `as` permite usarlo como h4 en las tarjetas de objeto y como div en las de
 * unidad, sin cambiar el marcado que ya había.
 */
function FitTitle({ children, className, as = 'div', maxFontSize = 13.1, minFontSize = 8 }) {
  const ref = useRef(null)
  const Tag = as

  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return undefined

    const fit = () => {
      let size = maxFontSize
      node.style.fontSize = `${size}px`
      while (size > minFontSize && node.scrollWidth > node.clientWidth + 1) {
        size -= 0.5
        node.style.fontSize = `${size}px`
      }
    }

    fit()
    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(fit)
    observer.observe(node)
    return () => observer.disconnect()
  }, [children, maxFontSize, minFontSize])

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  )
}

export default FitTitle
