import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { getUnitTypeBadgeSrc } from '../unitTypeBadges.js'
import { formatSpeedValue, getUnitSpecialtyForMode, getUnitSpecialtyLabelForMode, getUnitTypeToken } from '../generatorUtils.js'
import { getAbilityDescription, getAbilityLabel } from '../../../utils/abilities.js'

// Ficha template images (1537×1023 px, RGBA con zona transparente para la imagen de unidad)
import fichaOrden from '../../../images/fichas/ficha_orden.webp'
import fichaLegado from '../../../images/fichas/ficha_legado.webp'
import fichaCaos from '../../../images/fichas/ficha_caos.webp'

// ─── Coordenadas medidas por análisis de píxeles ──────────────────────────
// Ventana imagen (zona transparente): x=25-715, y=247-719
// Panel izq NOMBRE:    y=14-176   → texto: top=81
// Panel izq TIPO:      y=188-234  → texto: top=196
// Barra stats:         y=720-829
// Especialidad:        y=831-1007
//
// Panel derecho datos (x=809-1528):
//   DISPARO fila1: y=161-221  fila2: y=221-281
//   CAC     fila1: y=401-462  fila2: y=462-524
//   Habilidades:   y=607-1007
//
// Columnas:
//   ARMA=809-999(190px) | ATAQUES=999-1086(87px) | ALCANCE=1086-1173(87px)
//   PRECISION=1173-1261(88px) | DAÑO=1261-1313(52px) | HABILIDADES=1313-1528(215px)

const CARD_W = 1537
const CARD_H = 1023
const FICHA_LAYOUT_STORAGE_KEY = 'zerolore.generator.ficha-layout.v3'
const FICHA_LAYOUT_EVENT = 'zerolore:ficha-layout-updated'
const FICHA_LAYOUT_DEV_KEY = 'zerolore.generator.layout-dev'

const WEAPON_FIELD_LAYOUT = [
  { key: 'ARMA', x: 0, w: 190, className: 'ficha-cell ficha-cell-nombre' },
  { key: 'ATAQUES', x: 190, w: 87, className: 'ficha-cell ficha-cell-center' },
  { key: 'ALCANCE', x: 277, w: 87, className: 'ficha-cell ficha-cell-center' },
  { key: 'PRECISION', x: 364, w: 88, className: 'ficha-cell ficha-cell-center' },
  { key: 'DANO', x: 452, w: 52, className: 'ficha-cell ficha-cell-center' },
  { key: 'HABILIDADES', x: 504, w: 215, className: 'ficha-cell ficha-cell-hab' },
]
const FICHA_LAYOUT = {
  image: { x: 29, y: 250, w: 686, h: 473 },
  name: { x: 180, y: 72, w: 539, h: 46 },
  type: { x: 31, y: 201, w: 187, h: 20 },
  era: { x: 230, y: 202, w: 185, h: 20 },
  faction: { x: 387, y: 120, w: 118, h: 44 },
  value: { x: 643, y: 191, w: 76, h: 44 },
  stats: {
    cellWidth: 110,
    cells: [
      { label: 'MOV', x: 39, y: 764 },
      { label: 'VIDAS', x: 178, y: 763 },
      { label: 'SALV', x: 317, y: 764 },
      { label: 'VEL', x: 469, y: 763 },
      { label: 'ESC', x: 597, y: 763 },
    ],
  },
  specialty: { x: 36, y: 882, w: 669, h: 99 },
  shooting: { x: 809, y: 159, w: 719, h: 124 },
  melee: { x: 809, y: 400, w: 719, h: 126 },
  abilities: { x: 872, y: 614, w: 595, h: 358 },
}

const FICHA_LAYOUT_GUIDE_OVERRIDES = [
  { label: 'DISPARO 1 ARMA', x: 848, y: 159, w: 153, h: 64 },
  { label: 'DISPARO 1 ATAQUES', x: 997, y: 160, w: 90, h: 62 },
  { label: 'DISPARO 1 ALCANCE', x: 1086, y: 160, w: 89, h: 64 },
  { label: 'DISPARO 1 PRECISION', x: 1173, y: 159, w: 90, h: 66 },
  { label: 'DISPARO 1 DANO', x: 1261, y: 161, w: 93, h: 64 },
  { label: 'DISPARO 1 HABILIDADES', x: 1349, y: 160, w: 140, h: 63 },
  { label: 'DISPARO 2 ARMA', x: 849, y: 222, w: 151, h: 60 },
  { label: 'DISPARO 2 ATAQUES', x: 999, y: 221, w: 87, h: 60 },
  { label: 'DISPARO 2 ALCANCE', x: 1087, y: 222, w: 87, h: 60 },
  { label: 'DISPARO 2 PRECISION', x: 1173, y: 222, w: 88, h: 60 },
  { label: 'DISPARO 2 DANO', x: 1261, y: 222, w: 90, h: 60 },
  { label: 'DISPARO 2 HABILIDADES', x: 1348, y: 221, w: 142, h: 62 },
  { label: 'CUERPO A CUERPO 1 ARMA', x: 850, y: 400, w: 150, h: 65 },
  { label: 'CUERPO A CUERPO 1 ATAQUES', x: 999, y: 402, w: 87, h: 62 },
  { label: 'CUERPO A CUERPO 1 ALCANCE', x: 1086, y: 402, w: 88, h: 62 },
  { label: 'CUERPO A CUERPO 1 PRECISION', x: 1173, y: 402, w: 88, h: 62 },
  { label: 'CUERPO A CUERPO 1 DANO', x: 1261, y: 400, w: 89, h: 63 },
  { label: 'CUERPO A CUERPO 1 HABILIDADES', x: 1347, y: 400, w: 142, h: 65 },
  { label: 'CUERPO A CUERPO 2 ARMA', x: 849, y: 463, w: 152, h: 62 },
  { label: 'CUERPO A CUERPO 2 ATAQUES', x: 999, y: 462, w: 87, h: 62 },
  { label: 'CUERPO A CUERPO 2 ALCANCE', x: 1086, y: 462, w: 87, h: 62 },
  { label: 'CUERPO A CUERPO 2 PRECISION', x: 1172, y: 462, w: 91, h: 62 },
  { label: 'CUERPO A CUERPO 2 DANO', x: 1260, y: 461, w: 89, h: 65 },
  { label: 'CUERPO A CUERPO 2 HABILIDADES', x: 1347, y: 461, w: 142, h: 64 },
]

// Posición de la primera fila de datos y paso entre filas (medidos en píxeles)
const DISPARO_ROW_0 = 171   // top de la primera fila disparo  (centro y=191 − 10px font-approx)
const DISPARO_ROW_H = 60    // altura de cada fila (y=161→221=60px)
const CAC_ROW_0     = 431   // top de la primera fila CAC       (centro y=431)
const CAC_ROW_H     = 62    // altura de cada fila CAC (y=401→462≈61px, 462→524≈62px)

const createWeaponFieldGuides = (prefix, area, rowHeight, rowCount = 2) =>
  Array.from({ length: rowCount }, (_, rowIndex) =>
    WEAPON_FIELD_LAYOUT.map((field) => ({
      label: `${prefix} ${rowIndex + 1} ${field.key}`,
      x: area.x + field.x,
      y: area.y + (rowHeight * rowIndex),
      w: field.w,
      h: rowHeight,
    })),
  ).flat()

const buildLayoutGuides = () => {
  const overrideMap = new Map(FICHA_LAYOUT_GUIDE_OVERRIDES.map((guide) => [guide.label, guide]))
  return [
    { label: 'NOMBRE', ...FICHA_LAYOUT.name },
    { label: 'TIPO', ...FICHA_LAYOUT.type },
    { label: 'ERA', ...FICHA_LAYOUT.era },
    { label: 'FACCION', ...FICHA_LAYOUT.faction },
    { label: 'VALOR', ...FICHA_LAYOUT.value },
    { label: 'IMAGEN', ...FICHA_LAYOUT.image },
    ...FICHA_LAYOUT.stats.cells.map((cell) => ({ label: cell.label, x: cell.x, y: cell.y, w: FICHA_LAYOUT.stats.cellWidth, h: 42 })),
    { label: 'ESPECIALIDAD', ...FICHA_LAYOUT.specialty },
    ...createWeaponFieldGuides('DISPARO', FICHA_LAYOUT.shooting, DISPARO_ROW_H),
    ...createWeaponFieldGuides('CUERPO A CUERPO', FICHA_LAYOUT.melee, CAC_ROW_H),
    { label: 'HABILIDADES', ...FICHA_LAYOUT.abilities },
  ].map((guide) => ({ ...guide, ...(overrideMap.get(guide.label) || {}) }))
}

let sharedGuideRectsCache = null

const getFichaTemplate = (factionId = '') => {
  const id = String(factionId).toLowerCase()
  if (id.includes('caos')) return fichaCaos
  if (id.includes('legado')) return fichaLegado
  return fichaOrden
}

const getEraToken = (label = '') => {
  const normalized = String(label || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

  if (normalized.includes('futuro') || normalized.includes('future')) return 'future'
  if (normalized.includes('pasado') || normalized.includes('past')) return 'past'
  return 'neutral'
}

const UNIT_TYPE_COLORS = {
  line: '#5dd66f',
  elite: '#5ea6ff',
  vehicle: '#f0d84a',
  monster: '#ff5454',
  hero: '#6fe9e2',
  titan: '#b37aff',
}

const ERA_COLORS = {
  future: '#6fe7dd',
  past: '#d86aa2',
  neutral: 'var(--accent)',
}

const FACTION_LABELS = {
  es: {
    orden: 'Orden',
    caos: 'Caos',
    legado: 'Legado',
    otros: 'Otros',
  },
  en: {
    orden: 'Order',
    caos: 'Chaos',
    legado: 'Legacy',
    otros: 'Others',
  },
}

const FACTION_COLORS = {
  orden: '#ff7a6b',
  caos: '#b37aff',
  legado: '#f0d84a',
  otros: '#7fd6ff',
}

const getFactionToken = (factionId = '') => {
  const normalized = String(factionId || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

  if (normalized.includes('caos')) return 'caos'
  if (normalized.includes('legado')) return 'legado'
  if (normalized.includes('otros') || normalized.includes('other')) return 'otros'
  return 'orden'
}

const ensureFichaText = (value, fallback = '-') => {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') {
    const normalized = value.trim()
    return normalized || fallback
  }
  const normalized = String(value).trim()
  return normalized || fallback
}

const formatDanio = (danio, critico) => {
  const d = ensureFichaText(danio)
  const c = ensureFichaText(critico)
  if (d === '-' && c === '-') return '-'
  return `${d}/${c}`
}

const formatHabilidades = (habilidades = []) => {
  if (!habilidades || !habilidades.length) return '-'
  return habilidades
    .map((h) => (typeof h === 'string' ? h : h?.nombre || h?.id || ''))
    .map((label) => ensureFichaText(label, ''))
    .filter(Boolean)
    .join('\n')
}

const clampGuideRect = (guide) => ({
  ...guide,
  x: Math.max(0, Math.min(CARD_W - guide.w, guide.x)),
  y: Math.max(0, Math.min(CARD_H - guide.h, guide.y)),
  w: Math.max(24, Math.min(CARD_W, guide.w)),
  h: Math.max(18, Math.min(CARD_H, guide.h)),
})

const cloneGuideRects = (guides) => guides.map((guide) => ({ ...guide }))

const sanitizeGuideRects = (rawGuides) => {
  const defaultGuides = buildLayoutGuides()
  const rawMap = new Map(
    Array.isArray(rawGuides)
      ? rawGuides
          .filter((guide) => guide && typeof guide.label === 'string')
          .map((guide) => [guide.label, guide])
      : [],
  )

  return defaultGuides.map((defaultGuide) => {
    const storedGuide = rawMap.get(defaultGuide.label)
    if (!storedGuide) return { ...defaultGuide }

    return clampGuideRect({
      ...defaultGuide,
      x: Number.isFinite(storedGuide.x) ? storedGuide.x : defaultGuide.x,
      y: Number.isFinite(storedGuide.y) ? storedGuide.y : defaultGuide.y,
      w: Number.isFinite(storedGuide.w) ? storedGuide.w : defaultGuide.w,
      h: Number.isFinite(storedGuide.h) ? storedGuide.h : defaultGuide.h,
    })
  })
}

const loadStoredGuideRects = () => {
  const defaultGuides = sanitizeGuideRects()
  if (typeof window === 'undefined') {
    sharedGuideRectsCache = defaultGuides
    return cloneGuideRects(defaultGuides)
  }

  try {
    const rawValue = window.localStorage.getItem(FICHA_LAYOUT_STORAGE_KEY)
    if (!rawValue) {
      sharedGuideRectsCache = defaultGuides
      return cloneGuideRects(defaultGuides)
    }

    const parsedValue = JSON.parse(rawValue)
    const normalizedGuides = sanitizeGuideRects(parsedValue)
    sharedGuideRectsCache = normalizedGuides
    return cloneGuideRects(normalizedGuides)
  } catch {
    const fallbackGuides = sharedGuideRectsCache || defaultGuides
    return cloneGuideRects(fallbackGuides)
  }
}

const persistGuideRects = (guides) => {
  const normalizedGuides = sanitizeGuideRects(guides)
  sharedGuideRectsCache = normalizedGuides

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(FICHA_LAYOUT_STORAGE_KEY, JSON.stringify(normalizedGuides))
    window.dispatchEvent(new CustomEvent(FICHA_LAYOUT_EVENT, { detail: cloneGuideRects(normalizedGuides) }))
  }

  return cloneGuideRects(normalizedGuides)
}

const areGuideRectsEqual = (left, right) =>
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
  const hasLocalFlag = window.localStorage.getItem(FICHA_LAYOUT_DEV_KEY) === '1'
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

function AutoFitText({
  as: Tag = 'div',
  className,
  style,
  children,
  maxFontSize,
  minFontSize = 7,
  step = 0.5,
  fitKey = '',
  ...rest
}) {
  const ComponentTag = Tag
  const ref = useAutoFitBox({ maxFontSize, minFontSize, step, dependencyKey: fitKey })

  return (
    <ComponentTag
      ref={ref}
      className={className}
      style={{ ...style, fontSize: `${maxFontSize}px` }}
      {...rest}
    >
      {children}
    </ComponentTag>
  )
}

const getWeaponFieldFontLimits = (fieldKey) => {
  if (fieldKey === 'ARMA') return { max: 18, min: 9 }
  if (fieldKey === 'HABILIDADES') return { max: 15, min: 8 }
  return { max: 20, min: 9 }
}

const resizeOrMoveGuide = (guide, interaction, nextPos) => {
  const deltaX = nextPos.x - interaction.startX
  const deltaY = nextPos.y - interaction.startY

  if (interaction.mode === 'resize-x') {
    return clampGuideRect({
      ...guide,
      w: interaction.originW + deltaX,
    })
  }

  if (interaction.mode === 'resize-both') {
    return clampGuideRect({
      ...guide,
      w: interaction.originW + deltaX,
      h: interaction.originH + deltaY,
    })
  }

  return clampGuideRect({
    ...guide,
    x: interaction.originX + deltaX,
    y: interaction.originY + deltaY,
  })
}

// ─── Componente principal ─────────────────────────────────────────────────
const UnitFichaCard = forwardRef(function UnitFichaCard({ unit, factionId, imageDataUrl, gameMode = 'escaramuza', eraLabel = '', lang = 'es', onImageClick, showLayoutToolbar = true }, ref) {
  const wrapperRef = useRef(null)
  const cardRef = useRef(null)

  // Captura la ficha exactamente como la ha pintado el navegador.
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
  const [isLayoutMode, setIsLayoutMode] = useState(false)
  const [canAccessLayoutMode] = useState(getCanAccessLayoutMode)
  const [cursorPos, setCursorPos] = useState(null)
  const [lockedPos, setLockedPos] = useState(null)
  const [guideRects, setGuideRects] = useState(() => loadStoredGuideRects())
  const [guideInteraction, setGuideInteraction] = useState(null)
  const [hasUnsavedLayoutChanges, setHasUnsavedLayoutChanges] = useState(false)
  const [layoutSaveState, setLayoutSaveState] = useState('idle')
  const layoutHistoryRef = useRef([])
  const latestGuideRectsRef = useRef(guideRects)

  // Escala el card de 1537×1023 para que quepa en su contenedor
  useEffect(() => {
    const wrapper = wrapperRef.current
    const card = cardRef.current
    if (!wrapper || !card) return
    const obs = new ResizeObserver(([entry]) => {
      const scale = entry.contentRect.width / CARD_W
      card.style.transform = `scale(${scale})`
      // Ajustar el alto del wrapper para que no haya espacio en blanco
      wrapper.style.height = `${CARD_H * scale}px`
    })
    obs.observe(wrapper)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const handleExternalLayoutUpdate = (event) => {
      const nextGuides = sanitizeGuideRects(event.detail)
      setGuideRects((currentGuides) => (areGuideRectsEqual(currentGuides, nextGuides) ? currentGuides : nextGuides))
      setHasUnsavedLayoutChanges(false)
      setLayoutSaveState('saved')
    }

    const handleStorageSync = (event) => {
      if (event.key !== FICHA_LAYOUT_STORAGE_KEY || !event.newValue) return
      try {
        const nextGuides = sanitizeGuideRects(JSON.parse(event.newValue))
        setGuideRects((currentGuides) => (areGuideRectsEqual(currentGuides, nextGuides) ? currentGuides : nextGuides))
        setHasUnsavedLayoutChanges(false)
        setLayoutSaveState('saved')
      } catch {
        // Ignore invalid persisted payloads and keep current local state.
      }
    }

    window.addEventListener(FICHA_LAYOUT_EVENT, handleExternalLayoutUpdate)
    window.addEventListener('storage', handleStorageSync)
    return () => {
      window.removeEventListener(FICHA_LAYOUT_EVENT, handleExternalLayoutUpdate)
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

  // Auto-guardar 600 ms después del último cambio de arrastre
  useEffect(() => {
    if (!hasUnsavedLayoutChanges) return undefined
    const timeoutId = window.setTimeout(() => {
      persistGuideRects(guideRects)
      setHasUnsavedLayoutChanges(false)
      setLayoutSaveState('saved')
    }, 600)
    return () => window.clearTimeout(timeoutId)
  }, [hasUnsavedLayoutChanges, guideRects])

  // Ctrl+Z / Cmd+Z → deshacer último movimiento en modo maquetación
  useEffect(() => {
    if (!isLayoutMode) return undefined
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        event.preventDefault()
        const history = layoutHistoryRef.current
        if (!history.length) return
        const previousState = history[history.length - 1]
        layoutHistoryRef.current = history.slice(0, -1)
        setGuideRects(previousState)
        setHasUnsavedLayoutChanges(true)
        setLayoutSaveState('undone')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isLayoutMode])

  const template = getFichaTemplate(factionId)
  const disparo = unit.armas_disparo || []
  const melee   = unit.armas_melee   || []
  const especialidad = getUnitSpecialtyForMode(unit, gameMode, lang)
  const especialidadNombre = getUnitSpecialtyLabelForMode(unit, gameMode)
  const shouldShowEspecialidadNombre = especialidadNombre && especialidadNombre !== '-' && especialidadNombre !== especialidad
  const unitTypeToken = getUnitTypeToken(unit.tipo)
  const fallbackBadgeSrc = getUnitTypeBadgeSrc(unit.tipo, unit.eras || eraLabel)
  const addImageLabel = lang === 'en' ? 'ADD IMAGE' : 'AÑADIR IMAGEN'
  const addImageAriaLabel = lang === 'en' ? 'Add unit image' : 'Añadir imagen de unidad'
  const eraToken = getEraToken(eraLabel)
  const factionToken = getFactionToken(factionId)
  const factionLabelsByLang = FACTION_LABELS[lang] || FACTION_LABELS.es
  const factionLabel = factionLabelsByLang[factionToken] || factionLabelsByLang.orden
  const normalizedGuideRects = sanitizeGuideRects(guideRects)
  const guideMap = Object.fromEntries(normalizedGuideRects.map((guide) => [guide.label, guide]))

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
      const nextGuides = sanitizeGuideRects(prev).map((guide) =>
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
    // Guardar snapshot para deshacer (máx 50 pasos)
    layoutHistoryRef.current = [...layoutHistoryRef.current.slice(-49), cloneGuideRects(normalizedGuideRects)]
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
      const normalizedGuides = persistGuideRects(latestGuideRectsRef.current)
      latestGuideRectsRef.current = normalizedGuides
      setGuideRects(normalizedGuides)
      setHasUnsavedLayoutChanges(false)
      setLayoutSaveState('saved')
    }
    setGuideInteraction(null)
  }

  const handleLayoutModeToggle = () => {
    if (!canAccessLayoutMode) return
    setGuideRects((current) => sanitizeGuideRects(current))
    setIsLayoutMode((current) => !current)
    setCursorPos(null)
  }

  return (
    <div ref={wrapperRef} className="ficha-wrapper">
      {canAccessLayoutMode && showLayoutToolbar ? (
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
        className={`ficha-card${isLayoutMode ? ' is-layout-mode' : ''}`}
        style={{ width: CARD_W, height: CARD_H }}
        onMouseMove={handlePointerMove}
        onMouseLeave={handlePointerLeave}
        onClick={handlePointerDown}
        onMouseUp={handlePointerUp}
      >
        {/* ── Capa 0: Imagen de la unidad (detrás de la plantilla) ── */}
        <div
          className="ficha-img-window"
          style={{
            left: guideMap.IMAGEN?.x ?? FICHA_LAYOUT.image.x,
            top: guideMap.IMAGEN?.y ?? FICHA_LAYOUT.image.y,
            width: guideMap.IMAGEN?.w ?? FICHA_LAYOUT.image.w,
            height: guideMap.IMAGEN?.h ?? FICHA_LAYOUT.image.h,
          }}
        >
          {imageDataUrl
            ? <img src={imageDataUrl} className="ficha-unit-img" alt={unit.nombre} />
            : (
              <button
                type="button"
                className="ficha-unit-img-placeholder"
                onClick={onImageClick}
                aria-label={addImageAriaLabel}
              >
                {fallbackBadgeSrc ? (
                  <span className="ficha-img-placeholder-art" aria-hidden="true">
                    <img src={fallbackBadgeSrc} className="ficha-img-placeholder-badge" alt="" />
                  </span>
                ) : null}
                {onImageClick ? (
                  <span className="ficha-img-add-label">+ {addImageLabel}</span>
                ) : null}
              </button>
            )}
        </div>

        {/* ── Capa 1: Template WebP ── */}
        <img src={template} className="ficha-template-img" alt="" aria-hidden="true" />

        {/* ── Capa 2: Datos de texto ── */}
        <div className="ficha-data-layer">

          {/* Nombre */}
          <AutoFitText
            className="ficha-abs ficha-nombre"
            style={rectToStyle(guideMap.NOMBRE || FICHA_LAYOUT.name)}
            maxFontSize={34}
            minFontSize={16}
            step={0.5}
            fitKey={`${unit.nombre || ''}-${guideMap.NOMBRE?.w || FICHA_LAYOUT.name.w}-${guideMap.NOMBRE?.h || FICHA_LAYOUT.name.h}`}
          >
            {ensureFichaText(unit.nombre).toUpperCase()}
          </AutoFitText>

          {/* Tipo */}
          <AutoFitText
            className={`ficha-abs ficha-tipo unit-type-${unitTypeToken}`}
            style={{
              ...rectToStyle(guideMap.TIPO || FICHA_LAYOUT.type),
              color: UNIT_TYPE_COLORS[unitTypeToken] || UNIT_TYPE_COLORS.line,
            }}
            maxFontSize={34}
            minFontSize={12}
            step={0.5}
            fitKey={`${unit.tipo || ''}-${guideMap.TIPO?.w || FICHA_LAYOUT.type.w}-${guideMap.TIPO?.h || FICHA_LAYOUT.type.h}`}
          >
            {ensureFichaText(unit.tipo).toUpperCase()}
          </AutoFitText>

          {eraLabel ? (
            <AutoFitText
              className={`ficha-abs ficha-era unit-era-${eraToken}`}
              style={{
                ...rectToStyle(guideMap.ERA || FICHA_LAYOUT.era),
                color: ERA_COLORS[eraToken] || ERA_COLORS.neutral,
              }}
              maxFontSize={34}
              minFontSize={12}
              step={0.5}
              fitKey={`${eraLabel}-${guideMap.ERA?.w || FICHA_LAYOUT.era.w}-${guideMap.ERA?.h || FICHA_LAYOUT.era.h}`}
            >
              {ensureFichaText(eraLabel).toUpperCase()}
            </AutoFitText>
          ) : null}

          <AutoFitText
            className={`ficha-abs ficha-faccion faction-${factionToken}`}
            style={{
              ...rectToStyle(guideMap.FACCION || FICHA_LAYOUT.faction),
              color: FACTION_COLORS[factionToken] || 'var(--accent)',
            }}
            maxFontSize={34}
            minFontSize={12}
            step={0.5}
            fitKey={`${factionLabel}-${guideMap.FACCION?.w || FICHA_LAYOUT.faction.w}-${guideMap.FACCION?.h || FICHA_LAYOUT.faction.h}`}
          >
            {ensureFichaText(factionLabel).toUpperCase()}
          </AutoFitText>

          {/* Valor (número) */}
          <AutoFitText
            className="ficha-abs ficha-valor-num"
            style={rectToStyle(guideMap.VALOR || FICHA_LAYOUT.value)}
            maxFontSize={36}
            minFontSize={12}
            step={0.5}
            fitKey={`${unit.valor_base ?? ''}-${guideMap.VALOR?.w || FICHA_LAYOUT.value.w}-${guideMap.VALOR?.h || FICHA_LAYOUT.value.h}`}
          >
            {ensureFichaText(unit.valor_base)}
          </AutoFitText>

          {/* Stats bar (5 celdas dentro de x=27-715, y=720-829) */}
          {[
            { key: 'MOV',   idx: 0, value: unit.movimiento },
            { key: 'VIDAS', idx: 1, value: unit.vidas },
            { key: 'SALV',  idx: 2, value: unit.salvacion },
            { key: 'VEL',   idx: 3, value: formatSpeedValue(unit.velocidad) },
            { key: 'ESC',   idx: 4, value: unit.escuadra_display ?? `${unit.escuadra_min}/${unit.escuadra_max}` },
          ].map(({ key, idx, value }) => (
            <StatCell
              key={key}
              left={guideMap[key]?.x ?? FICHA_LAYOUT.stats.cells[idx].x}
              top={guideMap[key]?.y ?? FICHA_LAYOUT.stats.cells[idx].y}
              width={guideMap[key]?.w ?? FICHA_LAYOUT.stats.cellWidth}
              height={guideMap[key]?.h ?? 99}
              value={value}
              label={key}
            />
          ))}

          {/* Especialidad */}
          <AutoFitText
            className="ficha-abs ficha-especialidad-text"
            style={rectToStyle(guideMap.ESPECIALIDAD || FICHA_LAYOUT.specialty)}
            maxFontSize={18}
            minFontSize={10}
            step={0.5}
            fitKey={`${especialidadNombre || ''}:${especialidad || ''}-${guideMap.ESPECIALIDAD?.w || FICHA_LAYOUT.specialty.w}-${guideMap.ESPECIALIDAD?.h || FICHA_LAYOUT.specialty.h}`}
          >
            <div className="ficha-specialty-line">
              {shouldShowEspecialidadNombre ? <strong>{ensureFichaText(especialidadNombre)}</strong> : null}
              <div className="ficha-specialty-desc">{ensureFichaText(especialidad)}</div>
            </div>
          </AutoFitText>

          {/* ── DISPARO: datos ── */}
          {disparo.length === 0 && (
            <EmptyRow
              guideMap={guideMap}
              prefix="DISPARO"
              rowIndex={1}
              fallbackArea={FICHA_LAYOUT.shooting}
              fallbackTop={DISPARO_ROW_0}
              fallbackRowH={DISPARO_ROW_H}
            />
          )}
          {disparo.slice(0, 2).map((w, i) => (
            <WeaponRow
              key={w.id || i}
              weapon={w}
              guideMap={guideMap}
              prefix="DISPARO"
              rowIndex={i + 1}
              fallbackArea={FICHA_LAYOUT.shooting}
              fallbackTop={DISPARO_ROW_0 + i * DISPARO_ROW_H}
              fallbackRowH={DISPARO_ROW_H}
              isMelee={false}
            />
          ))}
          {disparo.length === 1 ? (
            <EmptyRow
              guideMap={guideMap}
              prefix="DISPARO"
              rowIndex={2}
              fallbackArea={FICHA_LAYOUT.shooting}
              fallbackTop={DISPARO_ROW_0 + DISPARO_ROW_H}
              fallbackRowH={DISPARO_ROW_H}
            />
          ) : null}

          {/* ── CAC: datos ── */}
          {melee.length === 0 && (
            <EmptyRow
              guideMap={guideMap}
              prefix="CUERPO A CUERPO"
              rowIndex={1}
              fallbackArea={FICHA_LAYOUT.melee}
              fallbackTop={CAC_ROW_0}
              fallbackRowH={CAC_ROW_H}
            />
          )}
          {melee.slice(0, 2).map((w, i) => (
            <WeaponRow
              key={w.id || i}
              weapon={w}
              guideMap={guideMap}
              prefix="CUERPO A CUERPO"
              rowIndex={i + 1}
              fallbackArea={FICHA_LAYOUT.melee}
              fallbackTop={CAC_ROW_0 + i * CAC_ROW_H}
              fallbackRowH={CAC_ROW_H}
              isMelee={true}
            />
          ))}
          {melee.length === 1 ? (
            <EmptyRow
              guideMap={guideMap}
              prefix="CUERPO A CUERPO"
              rowIndex={2}
              fallbackArea={FICHA_LAYOUT.melee}
              fallbackTop={CAC_ROW_0 + CAC_ROW_H}
              fallbackRowH={CAC_ROW_H}
            />
          ) : null}

          {/* ── Habilidades de arma ── */}
          <WeaponAbilities disparo={disparo} melee={melee} guideMap={guideMap} lang={lang} />

        </div>

        {isLayoutMode ? (
          <div className="ficha-layout-overlay" aria-hidden="true">
            <div className="ficha-layout-grid" />
            {normalizedGuideRects.map((guide) => (
              <div
                key={guide.label}
                className={`ficha-layout-guide-box${guideInteraction?.label === guide.label ? ' dragging' : ''}`}
                style={{
                  left: guide.x,
                  top: guide.y,
                  width: guide.w,
                  height: guide.h,
                }}
                onMouseDown={(event) => handleGuidePointerDown(event, guide, 'move')}
              >
                <span>{guide.label}</span>
                <button
                  type="button"
                  className="ficha-layout-resize ficha-layout-resize-side"
                  aria-label={`Redimensionar ${guide.label} en ancho`}
                  onMouseDown={(event) => handleGuidePointerDown(event, guide, 'resize-x')}
                />
                <button
                  type="button"
                  className="ficha-layout-resize ficha-layout-resize-corner"
                  aria-label={`Redimensionar ${guide.label}`}
                  onMouseDown={(event) => handleGuidePointerDown(event, guide, 'resize-both')}
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

export default UnitFichaCard

// ─── Celda de stat ───────────────────────────────────────────────────────
function StatCell({ left, top, value, label, width, height }) {
  return (
    <div className="ficha-abs ficha-stat-cell" style={{ left, top, width, height }}>
      <AutoFitText
        as="span"
        className="ficha-stat-value"
        style={{ width: '100%', height: '100%' }}
        maxFontSize={26}
        minFontSize={10}
        step={0.5}
        fitKey={`${label}-${value ?? '-'}-${width}-${height}`}
      >
        {ensureFichaText(value)}
      </AutoFitText>
      <span className="ficha-stat-label">{label}</span>
    </div>
  )
}

const getWeaponFieldRect = (guideMap, prefix, rowIndex, fieldKey, fallbackArea, fallbackTop, fallbackRowH) => {
  const fieldLayout = WEAPON_FIELD_LAYOUT.find((field) => field.key === fieldKey)
  const guide = guideMap[`${prefix} ${rowIndex} ${fieldKey}`]
  if (guide) return guide
  return {
    x: fallbackArea.x + fieldLayout.x,
    y: fallbackTop,
    w: fieldLayout.w,
    h: fallbackRowH,
  }
}

// ─── Fila de datos de arma ───────────────────────────────────────────────
function WeaponRow({ weapon, guideMap, prefix, rowIndex, fallbackArea, fallbackTop, fallbackRowH, isMelee }) {
  const danio = formatDanio(weapon.danio, weapon.danio_critico)
  const habs  = formatHabilidades(weapon.habilidades)
  const fieldValues = {
    ARMA: ensureFichaText(weapon.nombre),
    ATAQUES: ensureFichaText(weapon.ataques),
    ALCANCE: isMelee ? '-' : ensureFichaText(weapon.distancia),
    PRECISION: isMelee ? '-' : ensureFichaText(weapon.impactos),
    DANO: danio,
    HABILIDADES: habs,
  }

  return (
    <>
      {WEAPON_FIELD_LAYOUT.map((field) => {
        const rect = getWeaponFieldRect(guideMap, prefix, rowIndex, field.key, fallbackArea, fallbackTop, fallbackRowH)
        const limits = getWeaponFieldFontLimits(field.key)
        return (
          <AutoFitText
            key={`${prefix}-${rowIndex}-${field.key}`}
            className={`ficha-abs ${field.className}`}
            style={rectToStyle(rect)}
            maxFontSize={limits.max}
            minFontSize={limits.min}
            step={0.5}
            fitKey={`${prefix}-${rowIndex}-${field.key}-${fieldValues[field.key] ?? ''}-${rect.w}-${rect.h}`}
          >
            {fieldValues[field.key]}
          </AutoFitText>
        )
      })}
    </>
  )
}

function EmptyRow({ guideMap, prefix, rowIndex, fallbackArea, fallbackTop, fallbackRowH }) {
  return (
    <>
      {WEAPON_FIELD_LAYOUT.map((field) => {
        const rect = getWeaponFieldRect(guideMap, prefix, rowIndex, field.key, fallbackArea, fallbackTop, fallbackRowH)
        return (
        <AutoFitText
          key={`empty-${fallbackArea.x}-${fallbackTop}-${field.key}`}
          className={`ficha-abs ${field.className}`}
          style={rectToStyle(rect)}
          maxFontSize={18}
          minFontSize={10}
          step={0.5}
          fitKey={`empty-${prefix}-${rowIndex}-${field.key}-${rect.w}-${rect.h}`}
        >
          -
        </AutoFitText>
      )})}
    </>
  )
}

// ─── Bloque de habilidades de arma ──────────────────────────────────────
function WeaponAbilities({ disparo, melee, guideMap, lang = 'es' }) {
  const all   = [...disparo, ...melee]
  const lines = []
  const seen = new Set()

  all.forEach((w) => {
    ;(w.habilidades || []).forEach((h) => {
      const raw = typeof h === 'string' ? h : (h?.nombre || h?.id || '')
      const nombre = ensureFichaText(getAbilityLabel(raw, lang) || raw, '')
      const desc = ensureFichaText(getAbilityDescription(raw, lang) || (typeof h === 'object' ? (h?.descripcion || '') : ''), '')
      const key = `${nombre}::${desc}`
      if (!nombre || seen.has(key)) return
      seen.add(key)
      lines.push({ nombre, desc })
    })
  })

  if (!lines.length) {
    lines.push({ nombre: '-', desc: '' })
  }

  const abilityRect = guideMap?.HABILIDADES || FICHA_LAYOUT.abilities

  return (
    <AutoFitText
      className="ficha-abs ficha-hab-content"
      style={{ ...rectToStyle(abilityRect), maxHeight: abilityRect.h }}
      maxFontSize={18}
      minFontSize={10}
      step={0.5}
      fitKey={`${lines.map((line) => `${line.nombre}:${line.desc}`).join('|')}-${abilityRect.w}-${abilityRect.h}`}
    >
      {lines.map((line, i) => (
        <div key={i} className="ficha-hab-line">
          <strong>{line.nombre}</strong>
          {line.desc ? <div className="ficha-hab-line-desc">{line.desc}</div> : null}
        </div>
      ))}
    </AutoFitText>
  )
}
