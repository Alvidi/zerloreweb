import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import fichasMisionesImg from '../../../images/fichas/misiones.png'

// ── AutoFitText: reduce el font-size hasta que el contenido quepa en la caja ──
function useAutoFitBox({ maxFontSize, minFontSize = 7, step = 0.5, dependencyKey = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    const node = ref.current
    if (!node || typeof window === 'undefined') return undefined
    let frameId = 0
    const fit = () => {
      window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(() => {
        const el = ref.current
        if (!el) return
        let size = maxFontSize
        el.style.fontSize = `${size}px`
        while (size > minFontSize && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)) {
          size = Math.max(minFontSize, size - step)
          el.style.fontSize = `${size}px`
        }
      })
    }
    fit()
    document.fonts?.ready?.then(fit).catch(() => {})
    const obs = new ResizeObserver(() => fit())
    obs.observe(node)
    return () => { window.cancelAnimationFrame(frameId); obs.disconnect() }
  }, [dependencyKey, maxFontSize, minFontSize, step])
  return ref
}

function AutoFitText({ as: Tag = 'div', className, style, children, maxFontSize, minFontSize = 7, step = 0.5, fitKey = '', ...rest }) {
  const ref = useAutoFitBox({ maxFontSize, minFontSize, step, dependencyKey: fitKey })
  return (
    <Tag ref={ref} className={className} style={{ ...style, fontSize: `${maxFontSize}px` }} {...rest}>
      {children}
    </Tag>
  )
}

const CARD_W = 1537
const CARD_H = 1023
const STORAGE_KEY = 'zerolore.rules.mission-ficha-layout.v1'
const LAYOUT_EVENT = 'zerolore:mission-ficha-layout-updated'
const DEV_KEY = 'zerolore.generator.layout-dev'

const DEFAULT_GUIDES = [
  { label: 'MISION',      x: 31,  y: 186, w: 190, h: 54  },
  { label: 'NUMERO',      x: 634, y: 186, w: 88,  h: 57  },
  { label: 'TITULO',      x: 134, y: 77,  w: 600, h: 70  },
  { label: 'LORE',        x: 48,  y: 282, w: 645, h: 55  },
  { label: 'OBJETIVO',    x: 50,  y: 345, w: 641, h: 130 },
  { label: 'DESCRIPCION', x: 50,  y: 488, w: 645, h: 397 },
  { label: 'PUNTOS',      x: 50,  y: 900, w: 648, h: 70  },
]

const clamp = (guide) => ({
  ...guide,
  x: Math.max(0, Math.min(CARD_W - guide.w, guide.x)),
  y: Math.max(0, Math.min(CARD_H - guide.h, guide.y)),
  w: Math.max(24, Math.min(CARD_W, guide.w)),
  h: Math.max(18, Math.min(CARD_H, guide.h)),
})

const sanitize = (raw) => {
  const rawMap = new Map(
    Array.isArray(raw)
      ? raw.filter((g) => g?.label).map((g) => [g.label, g])
      : [],
  )
  return DEFAULT_GUIDES.map((def) => {
    const stored = rawMap.get(def.label)
    if (!stored) return { ...def }
    return clamp({
      ...def,
      x: Number.isFinite(stored.x) ? stored.x : def.x,
      y: Number.isFinite(stored.y) ? stored.y : def.y,
      w: Number.isFinite(stored.w) ? stored.w : def.w,
      h: Number.isFinite(stored.h) ? stored.h : def.h,
    })
  })
}

const load = () => {
  try {
    const raw = typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY)
    return raw ? sanitize(JSON.parse(raw)) : sanitize([])
  } catch {
    return sanitize([])
  }
}

const persist = (guides) => {
  const normalized = sanitize(guides)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
    window.dispatchEvent(new CustomEvent(LAYOUT_EVENT, { detail: normalized }))
  }
  return normalized
}

const canAccess = () =>
  typeof window !== 'undefined'
  && (['localhost', '127.0.0.1'].includes(window.location.hostname)
    || window.localStorage.getItem(DEV_KEY) === '1')

const resizeOrMove = (guide, interaction, pos) => {
  const dx = pos.x - interaction.startX
  const dy = pos.y - interaction.startY
  if (interaction.mode === 'resize-x')    return clamp({ ...guide, w: interaction.originW + dx })
  if (interaction.mode === 'resize-both') return clamp({ ...guide, w: interaction.originW + dx, h: interaction.originH + dy })
  return clamp({ ...guide, x: interaction.originX + dx, y: interaction.originY + dy })
}

const MissionFichaCard = forwardRef(function MissionFichaCard({ ficha, disableLayout = false }, ref) {
  const wrapperRef = useRef(null)
  const cardRef    = useRef(null)
  const latestRef  = useRef(null)
  const historyRef = useRef([])

  const [guides, setGuides]           = useState(() => load())
  const [isLayout, setIsLayout]       = useState(false)
  const [canLayout]                   = useState(() => !disableLayout && canAccess())
  const [cursorPos, setCursorPos]     = useState(null)
  const [lockedPos, setLockedPos]     = useState(null)
  const [interaction, setInteraction] = useState(null)
  const [saveState, setSaveState]     = useState('idle')
  const [unsaved, setUnsaved]         = useState(false)

  latestRef.current = guides

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

  // Scale card to fit wrapper
  useEffect(() => {
    const wrapper = wrapperRef.current
    const card    = cardRef.current
    if (!wrapper || !card) return undefined
    const obs = new ResizeObserver(([entry]) => {
      const scale = entry.contentRect.width / CARD_W
      card.style.transform = `scale(${scale})`
      wrapper.style.height = `${CARD_H * scale}px`
    })
    obs.observe(wrapper)
    return () => obs.disconnect()
  }, [])

  // Sync from other tabs / windows
  useEffect(() => {
    const handleEvent = (e) => setGuides(sanitize(e.detail))
    const handleStorage = (e) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return
      try { setGuides(sanitize(JSON.parse(e.newValue))) } catch { /* ignore */ }
    }
    window.addEventListener(LAYOUT_EVENT, handleEvent)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener(LAYOUT_EVENT, handleEvent)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  // Auto-save 600ms after last drag
  useEffect(() => {
    if (!unsaved) return undefined
    const id = window.setTimeout(() => {
      persist(latestRef.current)
      setUnsaved(false)
      setSaveState('saved')
    }, 600)
    return () => window.clearTimeout(id)
  }, [unsaved])

  // Clear "saved" badge after 1.8s
  useEffect(() => {
    if (saveState === 'idle') return undefined
    const id = window.setTimeout(() => setSaveState('idle'), 1800)
    return () => window.clearTimeout(id)
  }, [saveState])

  // Ctrl+Z undo in layout mode
  useEffect(() => {
    if (!isLayout) return undefined
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        const history = historyRef.current
        if (!history.length) return
        setGuides(history[history.length - 1])
        historyRef.current = history.slice(0, -1)
        setUnsaved(true)
        setSaveState('undone')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isLayout])

  const getCardPos = (clientX, clientY) => {
    const card = cardRef.current
    if (!card) return null
    const rect = card.getBoundingClientRect()
    return {
      x: Math.round(Math.max(0, Math.min(CARD_W, ((clientX - rect.left) / rect.width) * CARD_W))),
      y: Math.round(Math.max(0, Math.min(CARD_H, ((clientY - rect.top) / rect.height) * CARD_H))),
    }
  }

  const handleMouseMove = (e) => {
    if (!isLayout) return
    const pos = getCardPos(e.clientX, e.clientY)
    setCursorPos(pos)
    if (!interaction || !pos) return
    setUnsaved(true)
    setSaveState('idle')
    setGuides((prev) => {
      const next = sanitize(prev).map((g) =>
        g.label === interaction.label ? resizeOrMove(g, interaction, pos) : g,
      )
      latestRef.current = next
      return next
    })
  }

  const handleMouseLeave = () => { if (isLayout) { setCursorPos(null); setInteraction(null) } }
  const handleMouseDown  = (e) => { if (isLayout) setLockedPos(getCardPos(e.clientX, e.clientY)) }
  const handleMouseUp    = () => {
    if (interaction) {
      persist(latestRef.current)
      setUnsaved(false)
      setSaveState('saved')
    }
    setInteraction(null)
  }

  const startGuideInteraction = (e, guide, mode = 'move') => {
    if (!isLayout) return
    e.stopPropagation()
    const pos = getCardPos(e.clientX, e.clientY)
    if (!pos) return
    historyRef.current = [...historyRef.current.slice(-49), guides.map((g) => ({ ...g }))]
    setLockedPos(pos)
    setInteraction({ label: guide.label, mode, startX: pos.x, startY: pos.y, originX: guide.x, originY: guide.y, originW: guide.w, originH: guide.h })
  }

  const guideMap = Object.fromEntries(guides.map((g) => [g.label, g]))

  const fieldStyle = (label) => {
    const g = guideMap[label]
    if (!g) return {}
    return { position: 'absolute', left: g.x, top: g.y, width: g.w, height: g.h, overflow: 'hidden' }
  }

  return (
    <div ref={wrapperRef} className="ficha-wrapper">
      {canLayout && (
        <div className="ficha-layout-toolbar">
          <button
            type="button"
            className={`ghost tiny ficha-layout-toggle${isLayout ? ' active' : ''}`}
            onClick={() => { setIsLayout((v) => !v); setCursorPos(null) }}
          >
            {isLayout ? 'Ocultar maquetación' : 'Modo maquetación'}
          </button>
          {isLayout && (
            <div className="ficha-layout-readouts">
              <span>{cursorPos ? `x ${cursorPos.x}px · y ${cursorPos.y}px` : 'mueve el ratón'}</span>
              <span>{saveState === 'saved' ? '✓ guardado' : saveState === 'undone' ? '↩ deshecho' : unsaved ? '● pendiente' : ''}</span>
            </div>
          )}
        </div>
      )}

      <div
        ref={cardRef}
        className={`ficha-card${isLayout ? ' is-layout-mode' : ''}`}
        style={{ width: CARD_W, height: CARD_H }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        {/* Plantilla */}
        <img src={fichasMisionesImg} className="ficha-template-img" alt="" aria-hidden="true" />

        {/* Capa de texto */}
        <div className="ficha-data-layer">

          <AutoFitText
            className="mission-abs mission-mision-label"
            style={fieldStyle('MISION')}
            maxFontSize={22}
            minFontSize={12}
            fitKey="MISIÓN"
          >
            MISIÓN
          </AutoFitText>

          <AutoFitText
            className="mission-abs mission-numero"
            style={fieldStyle('NUMERO')}
            maxFontSize={36}
            minFontSize={18}
            fitKey={ficha.number}
          >
            {ficha.number}
          </AutoFitText>

          <AutoFitText
            className="mission-abs mission-titulo"
            style={fieldStyle('TITULO')}
            maxFontSize={48}
            minFontSize={18}
            fitKey={ficha.title}
          >
            {ficha.title}
          </AutoFitText>

          {ficha.flavor && (
            <AutoFitText
              className="mission-abs mission-lore"
              style={fieldStyle('LORE')}
              maxFontSize={20}
              minFontSize={10}
              fitKey={ficha.flavor}
            >
              <em>"{ficha.flavor}"</em>
            </AutoFitText>
          )}

          <AutoFitText
            className="mission-abs mission-objetivo"
            style={fieldStyle('OBJETIVO')}
            maxFontSize={26}
            minFontSize={16}
            fitKey={ficha.summary}
          >
            <span className="mission-field-label">Objetivo</span>
            <p>{ficha.summary}</p>
          </AutoFitText>

          {ficha.copy && (
            <AutoFitText
              className="mission-abs mission-descripcion"
              style={fieldStyle('DESCRIPCION')}
              maxFontSize={26}
              minFontSize={16}
              fitKey={ficha.copy}
            >
              <span className="mission-field-label">Descripción</span>
              <p>{ficha.copy}</p>
            </AutoFitText>
          )}

          <AutoFitText
            className="mission-abs mission-puntos"
            style={fieldStyle('PUNTOS')}
            maxFontSize={26}
            minFontSize={16}
            fitKey={ficha.meta}
          >
            <span className="mission-field-label">Puntos</span>
            <p>{ficha.meta}</p>
          </AutoFitText>

        </div>

        {/* Overlay modo maquetación */}
        {isLayout && (
          <div className="ficha-layout-overlay" aria-hidden="true">
            <div className="ficha-layout-grid" />
            {guides.map((guide) => (
              <div
                key={guide.label}
                className={`ficha-layout-guide-box${interaction?.label === guide.label ? ' dragging' : ''}`}
                style={{ left: guide.x, top: guide.y, width: guide.w, height: guide.h }}
                onMouseDown={(e) => startGuideInteraction(e, guide, 'move')}
              >
                <span>{guide.label}</span>
                <button
                  type="button"
                  className="ficha-layout-resize ficha-layout-resize-side"
                  aria-label={`Redimensionar ${guide.label} en ancho`}
                  onMouseDown={(e) => startGuideInteraction(e, guide, 'resize-x')}
                />
                <button
                  type="button"
                  className="ficha-layout-resize ficha-layout-resize-corner"
                  aria-label={`Redimensionar ${guide.label}`}
                  onMouseDown={(e) => startGuideInteraction(e, guide, 'resize-both')}
                />
              </div>
            ))}
            {cursorPos && (
              <>
                <div className="ficha-layout-crosshair ficha-layout-crosshair-x" style={{ top: cursorPos.y }} />
                <div className="ficha-layout-crosshair ficha-layout-crosshair-y" style={{ left: cursorPos.x }} />
              </>
            )}
            {lockedPos && (
              <div className="ficha-layout-locked-point" style={{ left: lockedPos.x, top: lockedPos.y }} />
            )}
          </div>
        )}
      </div>
    </div>
  )
})

export default MissionFichaCard
