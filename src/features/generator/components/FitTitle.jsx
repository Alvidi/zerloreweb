import { useLayoutEffect, useRef } from 'react'

/**
 * Título que encoge hasta caber en una sola línea: se mide el texto y se baja el
 * tamaño de letra mientras desborde. Así los nombres largos no se parten ni
 * obligan a reservar una segunda línea que deja hueco a los cortos.
 *
 * `as` permite usarlo como h4 en las tarjetas de objeto y como div en las de
 * unidad, sin cambiar el marcado que ya había.
 *
 * Con `axis="y"` encaja en alto en vez de en ancho: sirve para textos de varias
 * líneas en una caja de altura fija, como las descripciones de las tarjetas.
 */
function FitTitle({ children, className, as = 'div', axis = 'x', maxFontSize = 13.1, minFontSize = 8, ...rest }) {
  const ref = useRef(null)
  const lastWidth = useRef(-1)
  const Tag = as

  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return undefined

    const overflows = axis === 'y'
      ? () => node.scrollHeight > node.clientHeight
      : () => node.scrollWidth > node.clientWidth

    const fit = () => {
      let size = maxFontSize
      node.style.fontSize = `${size}px`
      while (size > minFontSize && overflows()) {
        size -= 0.5
        node.style.fontSize = `${size}px`
      }
      lastWidth.current = node.clientWidth
    }

    lastWidth.current = -1
    fit()
    if (typeof ResizeObserver === 'undefined') return undefined
    // Solo se vuelve a medir si cambia el ancho disponible. Sin esta guarda, el
    // propio cambio de tamaño de letra dispara al observador y se realimenta.
    let pending = 0
    const observer = new ResizeObserver(() => {
      if (node.clientWidth === lastWidth.current || pending) return
      // Fuera del callback: cambiar el tamaño desde dentro realimenta al
      // observador y el navegador se queja de bucle.
      pending = requestAnimationFrame(() => { pending = 0; fit() })
    })
    observer.observe(node)
    return () => {
      if (pending) cancelAnimationFrame(pending)
      observer.disconnect()
    }
  }, [children, axis, maxFontSize, minFontSize])

  return (
    <Tag ref={ref} className={className} {...rest}>
      {children}
    </Tag>
  )
}

export default FitTitle
