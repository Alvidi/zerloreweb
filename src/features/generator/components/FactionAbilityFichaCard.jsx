import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import fichaOrdenHab from '../../../images/fichas/orden_hab.webp'
import fichaLegadoHab from '../../../images/fichas/legado_hab.webp'
import fichaCaosHab from '../../../images/fichas/caos_hab.webp'

const CARD_W = 1537
const CARD_H = 1023
const ABILITY_LAYOUT_STORAGE_KEY = 'zerolore.generator.ficha-habilidad-layout.v1'
const ABILITY_LAYOUT_EVENT = 'zerolore:ficha-habilidad-layout-updated'
const ABILITY_LAYOUT_DEV_KEY = 'zerolore.generator.layout-dev'

const ABILITY_LAYOUT = [
  { label: 'NOMBRE', x: 260, y: 70, w: 380, h: 44 },
  { label: 'FACCION', x: 31, y: 190, w: 185, h: 44 },
  { label: 'TIPO', x: 230, y: 190, w: 220, h: 44 },
  { label: 'VALOR', x: 650, y: 184, w: 62, h: 52 },
  { label: 'DESCRIPCION', x: 850, y: 196, w: 620, h: 760 },
]

const cloneGuides = (guides) => guides.map((guide) => ({ ...guide }))

const clampGuide = (guide) => ({
  ...guide,
  x: Math.max(0, Math.min(CARD_W - guide.w, guide.x)),
  y: Math.max(0, Math.min(CARD_H - guide.h, guide.y)),
  w: Math.max(24, Math.min(CARD_W, guide.w)),
  h: Math.max(18, Math.min(CARD_H, guide.h)),
})

const sanitizeGuides = (rawGuides) => {
  const rawMap = new Map(
    Array.isArray(rawGuides)
      ? rawGuides
          .filter((guide) => guide && typeof guide.label === 'string')
          .map((guide) => [guide.label, guide])
      : [],
  )

  return ABILITY_LAYOUT.map((defaultGuide) => {
    const storedGuide = rawMap.get(defaultGuide.label)
    if (!storedGuide) return { ...defaultGuide }
    return clampGuide({
      ...defaultGuide,
      x: Number.isFinite(storedGuide.x) ? storedGuide.x : defaultGuide.x,
      y: Number.isFinite(storedGuide.y) ? storedGuide.y : defaultGuide.y,
      w: Number.isFinite(storedGuide.w) ? storedGuide.w : defaultGuide.w,
      h: Number.isFinite(storedGuide.h) ? storedGuide.h : defaultGuide.h,
    })
  })
}

const loadStoredGuides = () => {
  const defaultGuides = sanitizeGuides()
  if (typeof window === 'undefined') return cloneGuides(defaultGuides)

  try {
    const rawValue = window.localStorage.getItem(ABILITY_LAYOUT_STORAGE_KEY)
    if (!rawValue) return cloneGuides(defaultGuides)
    return cloneGuides(sanitizeGuides(JSON.parse(rawValue)))
  } catch {
    return cloneGuides(defaultGuides)
  }
}

const persistGuides = (guides) => {
  const normalizedGuides = sanitizeGuides(guides)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(ABILITY_LAYOUT_STORAGE_KEY, JSON.stringify(normalizedGuides))
    window.dispatchEvent(new CustomEvent(ABILITY_LAYOUT_EVENT, { detail: cloneGuides(normalizedGuides) }))
  }
  return cloneGuides(normalizedGuides)
}

const areGuidesEqual = (left, right) =>
  left.length === right.length
  && left.every((guide, index) => {
    const otherGuide = right[index]
    return otherGuide
      && guide.label === otherGuide.label
      && guide.x === otherGuide.x
      && guide.y === otherGuide.y
      && guide.w === otherGuide.w
      && guide.h === otherGuide.h
  })

const rectToStyle = (rect) => ({
  left: rect?.x ?? 0,
  top: rect?.y ?? 0,
  width: rect?.w ?? 0,
  height: rect?.h ?? 'auto',
})

const getCanAccessLayoutMode = () => {
  if (typeof window === 'undefined') return false
  const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  const hasLocalFlag = window.localStorage.getItem(ABILITY_LAYOUT_DEV_KEY) === '1'
  return isLocalHost || hasLocalFlag
}

const useAutoFitBox = ({ maxFontSize, minFontSize = 7, step = 0.5, dependencyKey = '' }) => {
  const ref = useRef(null)

  useEffect(() => {
    const node = ref.current
    if (!node || typeof window === 'undefined') return undefined

    let frameId = 0
    const fitText = () => {
      window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(() => {
        const element = ref.current
        if (!element) return

        let nextSize = maxFontSize
        element.style.fontSize = `${nextSize}px`
        while (
          nextSize > minFontSize
          && (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1)
        ) {
          nextSize = Math.max(minFontSize, nextSize - step)
          element.style.fontSize = `${nextSize}px`
        }
      })
    }

    fitText()
    document.fonts?.ready?.then(fitText).catch(() => {})
    const observer = new ResizeObserver(() => fitText())
    observer.observe(node)
    return () => {
      window.cancelAnimationFrame(frameId)
      observer.disconnect()
    }
  }, [dependencyKey, maxFontSize, minFontSize, step])

  return ref
}

function AutoFitText({ as: Tag = 'div', className, style, children, maxFontSize, minFontSize = 7, step = 0.5, fitKey = '', ...rest }) {
  const ComponentTag = Tag
  const ref = useAutoFitBox({ maxFontSize, minFontSize, step, dependencyKey: fitKey })
  return (
    <ComponentTag ref={ref} className={className} style={{ ...style, fontSize: `${maxFontSize}px` }} {...rest}>
      {children}
    </ComponentTag>
  )
}

const resizeOrMoveGuide = (guide, interaction, nextPos) => {
  const deltaX = nextPos.x - interaction.startX
  const deltaY = nextPos.y - interaction.startY

  if (interaction.mode === 'resize-x') {
    return clampGuide({ ...guide, w: interaction.originW + deltaX })
  }

  if (interaction.mode === 'resize-both') {
    return clampGuide({
      ...guide,
      w: interaction.originW + deltaX,
      h: interaction.originH + deltaY,
    })
  }

  return clampGuide({
    ...guide,
    x: interaction.originX + deltaX,
    y: interaction.originY + deltaY,
  })
}

const getAbilityTemplate = (factionId = '') => {
  const id = String(factionId).toLowerCase()
  if (id.includes('caos')) return fichaCaosHab
  if (id.includes('legado')) return fichaLegadoHab
  return fichaOrdenHab
}

const getFactionLabel = (factionId = '') => {
  const id = String(factionId).toLowerCase()
  if (id.includes('caos')) return 'Caos'
  if (id.includes('legado')) return 'Legado'
  return 'Orden'
}

const ensureText = (value, fallback = '-') => {
  const text = String(value || '').trim()
  return text || fallback
}

const FactionAbilityFichaCard = forwardRef(function FactionAbilityFichaCard({
  ability,
  factionId,
  description = '',
}, ref) {
  const wrapperRef = useRef(null)
  const cardRef = useRef(null)
  const [isLayoutMode, setIsLayoutMode] = useState(false)
  const [canAccessLayoutMode] = useState(getCanAccessLayoutMode)
  const [cursorPos, setCursorPos] = useState(null)
  const [lockedPos, setLockedPos] = useState(null)
  const [guideRects, setGuideRects] = useState(() => loadStoredGuides())
  const [guideInteraction, setGuideInteraction] = useState(null)
  const [hasUnsavedLayoutChanges, setHasUnsavedLayoutChanges] = useState(false)
  const [layoutSaveState, setLayoutSaveState] = useState('idle')
  const latestGuideRectsRef = useRef(guideRects)
  const layoutHistoryRef = useRef([])

  useImperativeHandle(ref, () => ({
    async captureAsCanvas() {
      const { default: html2canvas } = await import('html2canvas')
      const el = wrapperRef.current
      if (!el) return null

      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      const rect = el.getBoundingClientRect()

      return html2canvas(el, {
        width: Math.ceil(rect.width),
        height: Math.ceil(rect.height),
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        logging: false,
        removeContainer: true,
        ignoreElements: (element) => element.classList?.contains('ficha-layout-toolbar'),
      })
    },
  }), [])

  useEffect(() => {
    const wrapper = wrapperRef.current
    const card = cardRef.current
    if (!wrapper || !card) return undefined
    const observer = new ResizeObserver(([entry]) => {
      const scale = entry.contentRect.width / CARD_W
      card.style.transform = `scale(${scale})`
      wrapper.style.height = `${CARD_H * scale}px`
    })
    observer.observe(wrapper)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const handleExternalLayoutUpdate = (event) => {
      const nextGuides = sanitizeGuides(event.detail)
      setGuideRects((currentGuides) => (areGuidesEqual(currentGuides, nextGuides) ? currentGuides : nextGuides))
      setHasUnsavedLayoutChanges(false)
      setLayoutSaveState('saved')
    }

    const handleStorageSync = (event) => {
      if (event.key !== ABILITY_LAYOUT_STORAGE_KEY || !event.newValue) return
      try {
        const nextGuides = sanitizeGuides(JSON.parse(event.newValue))
        setGuideRects((currentGuides) => (areGuidesEqual(currentGuides, nextGuides) ? currentGuides : nextGuides))
        setHasUnsavedLayoutChanges(false)
        setLayoutSaveState('saved')
      } catch {
        // Keep current local state on invalid persisted payloads.
      }
    }

    window.addEventListener(ABILITY_LAYOUT_EVENT, handleExternalLayoutUpdate)
    window.addEventListener('storage', handleStorageSync)
    return () => {
      window.removeEventListener(ABILITY_LAYOUT_EVENT, handleExternalLayoutUpdate)
      window.removeEventListener('storage', handleStorageSync)
    }
  }, [])

  useEffect(() => {
    latestGuideRectsRef.current = guideRects
  }, [guideRects])

  useEffect(() => {
    if (layoutSaveState === 'idle') return undefined
    const timeoutId = window.setTimeout(() => setLayoutSaveState('idle'), 1800)
    return () => window.clearTimeout(timeoutId)
  }, [layoutSaveState])

  useEffect(() => {
    if (!hasUnsavedLayoutChanges) return undefined
    const timeoutId = window.setTimeout(() => {
      const normalizedGuides = persistGuides(guideRects)
      latestGuideRectsRef.current = normalizedGuides
      setHasUnsavedLayoutChanges(false)
      setLayoutSaveState('saved')
    }, 600)
    return () => window.clearTimeout(timeoutId)
  }, [hasUnsavedLayoutChanges, guideRects])

  useEffect(() => {
    if (!isLayoutMode) return undefined
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        event.preventDefault()
        const history = layoutHistoryRef.current
        if (!history.length) return
        const previousState = history[history.length - 1]
        layoutHistoryRef.current = history.slice(0, -1)
        latestGuideRectsRef.current = previousState
        setGuideRects(previousState)
        setHasUnsavedLayoutChanges(true)
        setLayoutSaveState('undone')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isLayoutMode])

  const normalizedGuideRects = sanitizeGuides(guideRects)
  const guideMap = Object.fromEntries(normalizedGuideRects.map((guide) => [guide.label, guide]))
  const template = getAbilityTemplate(factionId)
  const title = ensureText(ability?.nombre)
  const body = ensureText(description || ability?.descripcion || ability?.efecto || ability?.texto)
  const cost = ability?.coste ?? ability?.valor ?? ability?.valor_habilidad ?? '-'
  const factionLabel = getFactionLabel(factionId)
  const typeLabel = 'Hab. de facción'

  const updateCursorPosition = (clientX, clientY) => {
    const card = cardRef.current
    if (!card) return null
    const rect = card.getBoundingClientRect()
    const x = Math.max(0, Math.min(CARD_W, ((clientX - rect.left) / rect.width) * CARD_W))
    const y = Math.max(0, Math.min(CARD_H, ((clientY - rect.top) / rect.height) * CARD_H))
    return {
      x: Math.round(x),
      y: Math.round(y),
      xPct: ((x / CARD_W) * 100).toFixed(2),
      yPct: ((y / CARD_H) * 100).toFixed(2),
    }
  }

  const handlePointerMove = (event) => {
    if (!isLayoutMode) return
    const nextPos = updateCursorPosition(event.clientX, event.clientY)
    setCursorPos(nextPos)
    if (!guideInteraction || !nextPos) return
    setHasUnsavedLayoutChanges(true)
    setLayoutSaveState('idle')
    setGuideRects((prev) => {
      const nextGuides = sanitizeGuides(prev).map((guide) =>
        guide.label === guideInteraction.label
          ? resizeOrMoveGuide(guide, guideInteraction, nextPos)
          : guide,
      )
      latestGuideRectsRef.current = nextGuides
      return nextGuides
    })
  }

  const handlePointerLeave = () => {
    if (!isLayoutMode) return
    setCursorPos(null)
    setGuideInteraction(null)
  }

  const handlePointerDown = (event) => {
    if (!isLayoutMode) return
    setLockedPos(updateCursorPosition(event.clientX, event.clientY))
  }

  const handleGuidePointerDown = (event, guide, mode = 'move') => {
    if (!isLayoutMode) return
    event.stopPropagation()
    const nextPos = updateCursorPosition(event.clientX, event.clientY)
    if (!nextPos) return
    layoutHistoryRef.current = [...layoutHistoryRef.current.slice(-49), cloneGuides(normalizedGuideRects)]
    setLockedPos(nextPos)
    setGuideInteraction({
      label: guide.label,
      mode,
      startX: nextPos.x,
      startY: nextPos.y,
      originX: guide.x,
      originY: guide.y,
      originW: guide.w,
      originH: guide.h,
    })
  }

  const handlePointerUp = () => {
    if (guideInteraction) {
      const normalizedGuides = persistGuides(latestGuideRectsRef.current)
      latestGuideRectsRef.current = normalizedGuides
      setGuideRects(normalizedGuides)
      setHasUnsavedLayoutChanges(false)
      setLayoutSaveState('saved')
    }
    setGuideInteraction(null)
  }

  const handleLayoutModeToggle = () => {
    if (!canAccessLayoutMode) return
    setGuideRects((current) => sanitizeGuides(current))
    setIsLayoutMode((current) => !current)
    setCursorPos(null)
  }

  return (
    <div ref={wrapperRef} className="ficha-wrapper ability-ficha-wrapper">
      {canAccessLayoutMode ? (
        <div className="ficha-layout-toolbar">
          <button
            type="button"
            className={`ghost tiny ficha-layout-toggle${isLayoutMode ? ' active' : ''}`}
            onClick={handleLayoutModeToggle}
          >
            {isLayoutMode ? 'Ocultar maquetación' : 'Modo maquetación'}
          </button>
          {isLayoutMode ? (
            <div className="ficha-layout-readouts">
              <span>
                Cursor: {cursorPos ? `x ${cursorPos.x}px · y ${cursorPos.y}px` : 'mueve el ratón'}
              </span>
              <span>
                {layoutSaveState === 'saved' ? '✓ guardado' : hasUnsavedLayoutChanges ? '● pendiente de guardar' : ''}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
      <div
        ref={cardRef}
        className={`ficha-card ability-ficha-card${isLayoutMode ? ' is-layout-mode' : ''}`}
        style={{ width: CARD_W, height: CARD_H }}
        onMouseMove={handlePointerMove}
        onMouseLeave={handlePointerLeave}
        onClick={handlePointerDown}
        onMouseUp={handlePointerUp}
      >
        <img src={template} className="ficha-template-img" alt="" aria-hidden="true" />
        <div className="ficha-data-layer">
          <AutoFitText
            className="ficha-abs ability-ficha-name"
            style={rectToStyle(guideMap.NOMBRE)}
            maxFontSize={34}
            minFontSize={12}
            fitKey={`${title}-${guideMap.NOMBRE?.w}-${guideMap.NOMBRE?.h}`}
          >
            {title}
          </AutoFitText>
          <AutoFitText
            className="ficha-abs ability-ficha-tag ability-ficha-faction"
            style={rectToStyle(guideMap.FACCION)}
            maxFontSize={28}
            minFontSize={10}
            fitKey={`${factionLabel}-${guideMap.FACCION?.w}-${guideMap.FACCION?.h}`}
          >
            {factionLabel}
          </AutoFitText>
          <AutoFitText
            className="ficha-abs ability-ficha-tag ability-ficha-type"
            style={rectToStyle(guideMap.TIPO)}
            maxFontSize={28}
            minFontSize={10}
            fitKey={`${typeLabel}-${guideMap.TIPO?.w}-${guideMap.TIPO?.h}`}
          >
            {typeLabel}
          </AutoFitText>
          <AutoFitText
            className="ficha-abs ability-ficha-value"
            style={rectToStyle(guideMap.VALOR)}
            maxFontSize={34}
            minFontSize={12}
            fitKey={`${cost}-${guideMap.VALOR?.w}-${guideMap.VALOR?.h}`}
          >
            {cost}
          </AutoFitText>
          <AutoFitText
            className="ficha-abs ability-ficha-description"
            style={{
              ...rectToStyle(guideMap.DESCRIPCION),
              lineHeight: body.length > 260 ? 1.14 : 1.22,
            }}
            maxFontSize={28}
            minFontSize={7}
            step={0.25}
            fitKey={`${body}-${guideMap.DESCRIPCION?.w}-${guideMap.DESCRIPCION?.h}-${guideMap.DESCRIPCION?.x}-${guideMap.DESCRIPCION?.y}`}
          >
            {body}
          </AutoFitText>
        </div>

        {isLayoutMode ? (
          <div className="ficha-layout-overlay" aria-hidden="true">
            <div className="ficha-layout-grid" />
            {normalizedGuideRects.map((guide) => (
              <div
                key={guide.label}
                className={`ficha-layout-guide-box${guideInteraction?.label === guide.label ? ' dragging' : ''}`}
                style={rectToStyle(guide)}
                onMouseDown={(event) => handleGuidePointerDown(event, guide, 'move')}
              >
                <span>{guide.label}</span>
                <button
                  type="button"
                  className="ficha-layout-resize ficha-layout-resize-side"
                  onMouseDown={(event) => handleGuidePointerDown(event, guide, 'resize-x')}
                  aria-label={`Redimensionar ${guide.label} ancho`}
                />
                <button
                  type="button"
                  className="ficha-layout-resize ficha-layout-resize-corner"
                  onMouseDown={(event) => handleGuidePointerDown(event, guide, 'resize-both')}
                  aria-label={`Redimensionar ${guide.label}`}
                />
              </div>
            ))}
            {cursorPos ? (
              <>
                <div className="ficha-layout-crosshair ficha-layout-crosshair-x" style={{ top: cursorPos.y }} />
                <div className="ficha-layout-crosshair ficha-layout-crosshair-y" style={{ left: cursorPos.x }} />
              </>
            ) : null}
            {lockedPos ? (
              <div
                className="ficha-layout-locked-point"
                style={{ left: lockedPos.x, top: lockedPos.y }}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
})

export default FactionAbilityFichaCard
