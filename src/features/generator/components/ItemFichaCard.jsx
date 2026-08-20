import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef } from 'react'

import fichaTemplate from '../../../images/fichas/equipamiento.png'
import itemIcon from '../../../images/units_icons/equipamiento.png'

// ─── Geometría medida sobre equipamiento.png (1537×1023) ──────────────────
//   Banda hexagonal (nombre)   y=18-166
//   Cajas                      y=186-247 · caja1 x=42-233 · caja2 x=247-453
//   Octógono VALOR             x=674-744
//   Panel blanco               x=38-743  y=269-981
const CARD_W = 1537
const CARD_H = 1023

const LAYOUT = {
  icon: { x: 44, y: 40, w: 106, h: 106 },
  name: { x: 166, y: 46, w: 476, h: 96 },
  tag: { x: 46, y: 190, w: 184, h: 50 },
  copies: { x: 250, y: 190, w: 198, h: 50 },
  valor: { x: 676, y: 190, w: 66, h: 50 },
  description: { x: 62, y: 300, w: 658, h: 650 },
}

const useAutoFit = ({ maxFontSize, minFontSize = 8, step = 0.5, fitKey = '', rect }) => {
  const ref = useRef(null)
  const fitRef = useRef(null)

  useLayoutEffect(() => {
    const node = ref.current
    if (!node || typeof window === 'undefined') return undefined

    let frameId = 0

    const fitNow = () => {
      const el = ref.current
      if (!el) return

      let size = maxFontSize
      el.style.fontSize = `${size}px`
      el.style.top = `${rect.y}px`

      while (
        size > minFontSize
        && (el.scrollWidth > el.clientWidth || el.offsetHeight > rect.h)
      ) {
        size = Math.max(minFontSize, size - step)
        el.style.fontSize = `${size}px`
      }

      el.style.top = `${Math.round(rect.y + Math.max(0, (rect.h - el.offsetHeight) / 2))}px`
    }

    const scheduleFit = () => {
      window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(fitNow)
    }

    fitRef.current = fitNow
    fitNow()
    document.fonts?.ready?.then(fitNow).catch(() => {})
    document.fonts?.addEventListener?.('loadingdone', scheduleFit)

    const observer = new ResizeObserver(scheduleFit)
    observer.observe(node)
    return () => {
      window.cancelAnimationFrame(frameId)
      document.fonts?.removeEventListener?.('loadingdone', scheduleFit)
      observer.disconnect()
    }
  }, [fitKey, maxFontSize, minFontSize, step, rect.x, rect.y, rect.w, rect.h])

  useLayoutEffect(() => {
    fitRef.current?.()
  })

  return ref
}

function FitBox({ className, rect, children, maxFontSize, minFontSize = 8, fitKey = '' }) {
  const ref = useAutoFit({ maxFontSize, minFontSize, fitKey, rect })
  return (
    <div ref={ref} className={className} style={{ left: rect.x, top: rect.y, width: rect.w }}>
      {children}
    </div>
  )
}

const box = (rect) => ({ left: rect.x, top: rect.y, width: rect.w, height: rect.h })

const CAPTURE_MARK = 'data-ficha2-capture'

const CAPTURE_TEXT_BOXES = ['.ficha2-name', '.ficha2-tag', '.ficha2-valor', '.ficha2-ability']

/** Ver UnitFichaCard: html2canvas baja el texto media interlínea. */
const alignTextBoxesForCapture = (liveCard, clonedDoc) => {
  const clonedCard = clonedDoc.querySelector(`[${CAPTURE_MARK}]`)
  if (!liveCard || !clonedCard) return

  CAPTURE_TEXT_BOXES.forEach((selector) => {
    const liveNodes = Array.from(liveCard.querySelectorAll(selector))
    const clonedNodes = Array.from(clonedCard.querySelectorAll(selector))

    liveNodes.forEach((liveNode, index) => {
      const clonedNode = clonedNodes[index]
      if (!clonedNode) return

      const styles = window.getComputedStyle(liveNode)
      const fontSize = parseFloat(styles.fontSize) || 0
      const parsedLineHeight = parseFloat(styles.lineHeight)
      const lineHeight = Number.isFinite(parsedLineHeight) ? parsedLineHeight : fontSize * 1.2

      clonedNode.style.overflow = 'visible'
      clonedNode.style.height = 'auto'
      clonedNode.style.top = `${(parseFloat(liveNode.style.top) || 0) - lineHeight / 2}px`
    })
  })
}

/**
 * Ficha de objeto. Comparte tipografías y estilos con la ficha de unidad
 * (Cinzel para lo titular, Inter para el cuerpo) sobre su propia plantilla.
 */
const ItemFichaCard = forwardRef(function ItemFichaCard({ item, count = 1 }, ref) {
  const wrapperRef = useRef(null)
  const cardRef = useRef(null)

  useImperativeHandle(ref, () => ({
    async captureAsCanvas() {
      const { default: html2canvas } = await import('html2canvas')
      const wrapper = wrapperRef.current
      const card = cardRef.current
      if (!card) return null

      const savedOverflow = wrapper?.style.overflow ?? ''
      const savedHeight = wrapper?.style.height ?? ''
      const savedTransform = card.style.transform

      if (wrapper) {
        wrapper.style.overflow = 'visible'
        wrapper.style.height = `${CARD_H}px`
      }
      card.style.transform = 'none'
      card.setAttribute(CAPTURE_MARK, '')

      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

      try {
        return await html2canvas(card, {
          width: CARD_W,
          height: CARD_H,
          scale: 2,
          useCORS: true,
          backgroundColor: null,
          logging: false,
          removeContainer: true,
          onclone: (clonedDoc) => alignTextBoxesForCapture(card, clonedDoc),
        })
      } finally {
        if (wrapper) {
          wrapper.style.overflow = savedOverflow
          wrapper.style.height = savedHeight
        }
        card.style.transform = savedTransform
        card.removeAttribute(CAPTURE_MARK)
      }
    },
  }), [])

  useEffect(() => {
    const wrapper = wrapperRef.current
    const card = cardRef.current
    if (!wrapper || !card) return undefined

    const observer = new ResizeObserver(([observed]) => {
      const scale = observed.contentRect.width / CARD_W
      card.style.transform = `scale(${scale})`
      wrapper.style.height = `${CARD_H * scale}px`
    })
    observer.observe(wrapper)
    return () => observer.disconnect()
  }, [])

  if (!item) return null

  return (
    <div ref={wrapperRef} className="ficha-wrapper">
      <div ref={cardRef} className="ficha2-card" style={{ width: CARD_W, height: CARD_H }}>
        <img className="ficha2-template" src={fichaTemplate} alt="" />

        <img className="ficha2-class-icon" style={box(LAYOUT.icon)} src={itemIcon} alt="" />

        <FitBox className="ficha2-name" rect={LAYOUT.name} maxFontSize={64} minFontSize={18} fitKey={item.nombre}>
          {item.nombre}
        </FitBox>

        <FitBox className="ficha2-tag unit-type-equipment" rect={LAYOUT.tag} maxFontSize={26} fitKey="objeto">
          Objeto
        </FitBox>

        {count > 0 ? (
          <FitBox className="ficha2-tag" rect={LAYOUT.copies} maxFontSize={26} fitKey={String(count)}>
            ×{count}
          </FitBox>
        ) : null}

        <FitBox className="ficha2-valor" rect={LAYOUT.valor} maxFontSize={34} fitKey={String(item.valor)}>
          {item.valor}
        </FitBox>

        <FitBox
          className="ficha2-ability ficha2-item-description"
          rect={LAYOUT.description}
          maxFontSize={40}
          minFontSize={10}
          fitKey={item.descripcion}
        >
          <span>{item.descripcion}</span>
        </FitBox>
      </div>
    </div>
  )
})

export default ItemFichaCard
