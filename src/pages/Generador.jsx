import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n/I18nContext.jsx'
import UnitFichaCard from '../features/generator/components/UnitFichaCard.jsx'
import MissionFichaCard from '../features/rules/components/MissionFichaCard.jsx'
import itemIcon from '../images/units_icons/equipamiento.png'
import objetosData from '../data/items/objetos.json'
import { getUnitClassBadgeSrc, getUnitClassToken } from '../features/generator/unitTypeBadges.js'
import {
  DEFAULT_ROLE_ID,
  HEROES,
  ROLES,
  buildHeroEntry,
  buildUnitEntry,
  clampSquadSize,
  UNIDADES,
  isUnidadAllowedInGameMode,
  getEntryValue,
  getUnidad,
} from '../features/generator/catalogUtils.js'

const MAX_UNIT_IMAGE_SIDE = 1600
const MAX_ITEM_COPIES = 3   // el reglamento permite hasta 3 copias del mismo objeto
const FICHA_CARD_W = 1536
const FICHA_CARD_H = 1024
const IMAGE_CROP_ASPECT_RATIO = 736 / 416   // ventana de arte de ficha2.png
const IMAGE_CROP_VIEWPORT_WIDTH = 360
const IMAGE_CROP_VIEWPORT_HEIGHT = Math.round(IMAGE_CROP_VIEWPORT_WIDTH / IMAGE_CROP_ASPECT_RATIO)
const EXPORT_PAGE_W = 1240  // A4 vertical (folio) ~210mm × 5.9px/mm
const EXPORT_PAGE_H = 1754  // A4 vertical (folio) ~297mm × 5.9px/mm
const EXPORT_MARGIN = 46    // ~8mm de margen
const EXPORT_GAP = 24       // ~4mm entre fichas
const CARDS_PER_PAGE = 2
const EXPORT_RASTER_SCALE = 2

// ─── Utilidades de imagen ─────────────────────────────────────────────────
const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

const loadImageFromDataUrl = (dataUrl) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.crossOrigin = 'anonymous'
    image.src = dataUrl
  })

const clampCropOffsets = ({ offsetX, offsetY, zoom, imageWidth, imageHeight }) => {
  if (!imageWidth || !imageHeight) return { offsetX: 0, offsetY: 0 }

  const baseScale = Math.max(IMAGE_CROP_VIEWPORT_WIDTH / imageWidth, IMAGE_CROP_VIEWPORT_HEIGHT / imageHeight)
  const maxOffsetX = Math.max(0, (imageWidth * baseScale * zoom - IMAGE_CROP_VIEWPORT_WIDTH) / 2)
  const maxOffsetY = Math.max(0, (imageHeight * baseScale * zoom - IMAGE_CROP_VIEWPORT_HEIGHT) / 2)

  return {
    offsetX: Math.min(maxOffsetX, Math.max(-maxOffsetX, offsetX)),
    offsetY: Math.min(maxOffsetY, Math.max(-maxOffsetY, offsetY)),
  }
}

const createCroppedImageDataUrl = async (sourceDataUrl, cropState) => {
  const image = await loadImageFromDataUrl(sourceDataUrl)
  const imageWidth = image.naturalWidth || image.width || 1
  const imageHeight = image.naturalHeight || image.height || 1
  const baseScale = Math.max(IMAGE_CROP_VIEWPORT_WIDTH / imageWidth, IMAGE_CROP_VIEWPORT_HEIGHT / imageHeight)
  const scale = baseScale * cropState.zoom
  const outputWidth = MAX_UNIT_IMAGE_SIDE
  const outputHeight = Math.round(outputWidth / IMAGE_CROP_ASPECT_RATIO)
  const outputScale = outputWidth / IMAGE_CROP_VIEWPORT_WIDTH
  const drawWidth = imageWidth * scale * outputScale
  const drawHeight = imageHeight * scale * outputScale

  const canvas = document.createElement('canvas')
  canvas.width = outputWidth
  canvas.height = outputHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context unavailable')

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.clearRect(0, 0, outputWidth, outputHeight)
  ctx.drawImage(
    image,
    (outputWidth - drawWidth) / 2 + cropState.offsetX * outputScale,
    (outputHeight - drawHeight) / 2 + cropState.offsetY * outputScale,
    drawWidth,
    drawHeight,
  )

  return canvas.toDataURL('image/png')
}

// ─── Utilidades de exportación ────────────────────────────────────────────
const chunkItems = (items, size) => {
  if (!Array.isArray(items) || size <= 0) return []
  const chunks = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

const waitForElementImages = async (element) => {
  if (!element) return
  await Promise.all(Array.from(element.querySelectorAll('img')).map((image) => {
    if (image.complete && image.naturalWidth > 0) return Promise.resolve()
    return new Promise((resolve) => {
      image.addEventListener('load', resolve, { once: true })
      image.addEventListener('error', resolve, { once: true })
    })
  }))
}

const waitForPrintReady = async (elements = []) => {
  if (document.fonts?.ready) await document.fonts.ready
  for (const element of elements) await waitForElementImages(element)
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

const renderExportPageCanvas = async (cardCanvases, scale = EXPORT_RASTER_SCALE) => {
  const pageCanvas = document.createElement('canvas')
  pageCanvas.width = EXPORT_PAGE_W * scale
  pageCanvas.height = EXPORT_PAGE_H * scale
  const ctx = pageCanvas.getContext('2d')
  ctx.scale(scale, scale)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.fillStyle = '#f8f5ed'
  ctx.fillRect(0, 0, EXPORT_PAGE_W, EXPORT_PAGE_H)

  // 2 fichas por folio, apiladas: cada una queda a ~195×130 mm, tamaño de
  // datasheet, que es lo que se lee cómodo en mesa.
  const cols = 1
  const rows = 2
  const gap = EXPORT_GAP
  const availableWidth = EXPORT_PAGE_W - EXPORT_MARGIN * 2
  const availableHeight = EXPORT_PAGE_H - EXPORT_MARGIN * 2 - gap * (rows - 1)
  const cardHeight = Math.floor(Math.min(availableHeight / rows, availableWidth / (FICHA_CARD_W / FICHA_CARD_H)))
  const cardWidth = Math.round(cardHeight * (FICHA_CARD_W / FICHA_CARD_H))
  const marginX = Math.round((EXPORT_PAGE_W - cols * cardWidth - gap * (cols - 1)) / 2)
  const marginY = Math.round((EXPORT_PAGE_H - rows * cardHeight - gap * (rows - 1)) / 2)

  cardCanvases.forEach((cardCanvas, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    ctx.drawImage(cardCanvas, marginX + col * (cardWidth + gap), marginY + row * (cardHeight + gap), cardWidth, cardHeight)
  })

  return pageCanvas
}

// ─── Componentes auxiliares ───────────────────────────────────────────────
function SpinnerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="2.2" />
      <path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

function GameModeIcon({ mode }) {
  if (mode === 'escuadra') {
    return (
      <svg viewBox="0 0 64 40" aria-hidden="true">
        <circle className="game-mode-icon-stroke" cx="15" cy="15" r="5" />
        <circle className="game-mode-icon-stroke" cx="49" cy="15" r="5" />
        <path className="game-mode-icon-stroke" d="M8 33c0-5.4 3.2-8.5 7-8.5s7 3.1 7 8.5" />
        <path className="game-mode-icon-stroke" d="M42 33c0-5.4 3.2-8.5 7-8.5s7 3.1 7 8.5" />
        <circle className="game-mode-icon-stroke" cx="32" cy="10" r="7" />
        <path className="game-mode-icon-stroke" d="M22 35c0-7.6 4.8-12 10-12s10 4.4 10 12" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 64 40" aria-hidden="true">
      <circle className="game-mode-icon-stroke" cx="32" cy="11" r="7" />
      <path className="game-mode-icon-stroke" d="M22 34c0-8 5.5-13 10-13s10 5 10 13" />
    </svg>
  )
}

function GameModePicker({ value, onChange, t }) {
  const options = [
    { value: 'escaramuza', label: t('generator.skirmish') },
    { value: 'escuadra', label: t('generator.squad') },
  ]

  return (
    <div className="field field-game-mode">
      <span>{t('generator.gameMode')}</span>
      <div className="game-mode-picker" role="radiogroup" aria-label={t('generator.gameMode')}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`game-mode-card${option.value === value ? ' active' : ''}`}
            onClick={() => onChange(option.value)}
            role="radio"
            aria-checked={option.value === value}
          >
            <span className="game-mode-card-icon"><GameModeIcon mode={option.value} /></span>
            <span className="game-mode-card-label">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/** Contador con + y − reutilizable (roles y objetos). */
function CountStepper({ count, onAdd, onRemove, addLabel, removeLabel, max = null, disabled = false, format = null }) {
  const atMax = max !== null && count >= max
  return (
    <div className="unit-role-stepper">
      <button
        type="button"
        className="unit-role-step"
        onClick={onRemove}
        disabled={disabled || count === 0}
        aria-label={removeLabel}
        title={removeLabel}
      >
        −
      </button>
      <span className="unit-role-count">{format ? format(count) : count}</span>
      <button
        type="button"
        className="unit-role-step"
        onClick={onAdd}
        disabled={disabled || atMax}
        aria-label={addLabel}
        title={addLabel}
      >
        +
      </button>
    </div>
  )
}

/** Selector de rol simple (barra de 3 botones), usado en el modal de ficha. */
function RolePicker({ value, onChange, label, names = null }) {
  return (
    <div className="unit-role-picker" role="radiogroup" aria-label={label}>
      {ROLES.map((role) => (
        <button
          key={role.id}
          type="button"
          className={`unit-role-btn unit-role-${role.id}${value === role.id ? ' active' : ''}`}
          aria-pressed={value === role.id}
          title={role.descripcion}
          onClick={() => onChange(role.id)}
        >
          {role.nombre}
          {names?.[role.id] ? <span className="unit-role-flavour"> ({names[role.id]})</span> : null}
        </button>
      ))}
    </div>
  )
}

/**
 * Caja de roles de la tarjeta de unidad: una fila por rol con su contador
 * y sus controles de añadir y quitar. Pulsar el nombre selecciona el rol
 * que se usa al ver la ficha.
 */
function RoleRoster({ counts, names, onAdd, onRemove, addLabel, removeLabel, disabled = false }) {
  return (
    <div className="unit-role-roster">
      {ROLES.map((role) => {
        const count = counts?.[role.id] || 0
        return (
          <div
            key={role.id}
            className={`unit-role-row${count > 0 ? ' has-count' : ''}${disabled ? ' is-disabled' : ''}`}
          >
            <span className="unit-role-name is-static" title={role.descripcion}>
              {role.nombre}
              {names?.[role.id] ? <span className="unit-role-flavour"> ({names[role.id]})</span> : null}
            </span>
            <CountStepper
              count={count}
              disabled={disabled}
              onAdd={() => onAdd(role.id)}
              onRemove={() => onRemove(role.id)}
              addLabel={`${addLabel} ${role.nombre}`}
              removeLabel={`${removeLabel} ${role.nombre}`}
              format={(value) => (value > 0 ? `×${value}` : '0')}
            />
          </div>
        )
      })}
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────
function Generador() {
  const { t } = useI18n()

  const [gameMode, setGameMode] = useState('escaramuza')
  const [selectedHeroId, setSelectedHeroId] = useState('')
  const [roleByUnidad, setRoleByUnidad] = useState({})
  const [armySelections, setArmySelections] = useState([])
  const [selectedItems, setSelectedItems] = useState({})
  const [activeGeneratorSection, setActiveGeneratorSection] = useState('units')
  const [openCatalogKey, setOpenCatalogKey] = useState('')
  const [openArmyUid, setOpenArmyUid] = useState('')
  const [pendingSquadUnidadId, setPendingSquadUnidadId] = useState('')
  const [pendingSquadRoleId, setPendingSquadRoleId] = useState(DEFAULT_ROLE_ID)
  const [pendingSquadSize, setPendingSquadSize] = useState(1)
  const [imageCropDraft, setImageCropDraft] = useState(null)
  const [isArmyPrintPreviewOpen, setIsArmyPrintPreviewOpen] = useState(false)
  const [armyDownloadError, setArmyDownloadError] = useState('')
  const [showItemFichaModal, setShowItemFichaModal] = useState(false)
  const [activeItemFicha, setActiveItemFicha] = useState(null)

  const armySheetRefs = useRef(new Map())
  const armyCardRefs = useRef(new Map())
  const armyExportStageRef = useRef(null)
  const modalCardRef = useRef(null)
  const selectionCounterRef = useRef(0)

  const activeItems = objetosData.objetos

  const getRoleFor = (unidadId) => roleByUnidad[unidadId] || DEFAULT_ROLE_ID

  /** Entradas del ejército resueltas contra el catálogo. */
  const armyEntries = useMemo(
    () =>
      armySelections
        .map((selection) => {
          const entry = selection.kind === 'heroe'
            ? buildHeroEntry(selection.heroId)
            : buildUnitEntry(selection.unidadId, selection.roleId)
          if (!entry) return null
          const squadSize = clampSquadSize(selection.squadSize, entry, gameMode)
          return {
            uid: selection.selectionId,
            kind: selection.kind,
            entry,
            squadSize,
            imageDataUrl: selection.imageDataUrl || '',
            total: getEntryValue(entry, squadSize, gameMode),
          }
        })
        .filter(Boolean),
    [armySelections, gameMode],
  )

  const armyHeroEntries = useMemo(() => armyEntries.filter((item) => item.kind === 'heroe'), [armyEntries])
  const armyUnitEntries = useMemo(() => armyEntries.filter((item) => item.kind === 'unidad'), [armyEntries])

  const selectedItemsTotalValue = useMemo(
    () => Object.entries(selectedItems).reduce((sum, [itemId, count]) => {
      const item = activeItems.find((candidate) => candidate.id === itemId)
      return sum + (item ? item.valor * count : 0)
    }, 0),
    [selectedItems, activeItems],
  )

  const currentArmyTotalValue = useMemo(
    () => armyEntries.reduce((sum, item) => sum + item.total, 0) + selectedItemsTotalValue,
    [armyEntries, selectedItemsTotalValue],
  )

  /** En Escaramuza se agrupan las unidades idénticas (misma clase y rol). */
  const armyUnitGroups = useMemo(() => {
    if (gameMode !== 'escaramuza') return null
    const groups = new Map()
    for (const item of armyUnitEntries) {
      const key = `${item.entry.unidadId}::${item.entry.roleId}`
      if (groups.has(key)) {
        const group = groups.get(key)
        group.count += 1
        group.totalValue += item.total
        group.uids.push(item.uid)
      } else {
        groups.set(key, { item, count: 1, totalValue: item.total, uids: [item.uid] })
      }
    }
    return Array.from(groups.values())
  }, [gameMode, armyUnitEntries])

  const armyExportEntries = useMemo(() => {
    if (!armyUnitGroups) return armyEntries
    return [
      ...armyHeroEntries,
      ...armyUnitGroups.map(({ item, count, totalValue }) => ({ ...item, _count: count, total: totalValue })),
    ]
  }, [armyUnitGroups, armyEntries, armyHeroEntries])

  const armyExportPages = useMemo(() => chunkItems(armyExportEntries, CARDS_PER_PAGE), [armyExportEntries])

  const unitCountByKey = useMemo(() => {
    const counts = new Map()
    for (const item of armyUnitEntries) {
      const key = `${item.entry.unidadId}::${item.entry.roleId}`
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    return counts
  }, [armyUnitEntries])

  // ── Acciones ────────────────────────────────────────────────────────────
  const updateSelection = (selectionId, patch) => {
    setArmySelections((current) =>
      current.map((selection) => (selection.selectionId === selectionId ? { ...selection, ...patch } : selection)),
    )
  }

  const handleGameModeChange = (nextMode) => {
    setGameMode(nextMode)
    setArmySelections((current) => current.filter((selection) => selection.kind === 'heroe'))
    setSelectedItems({})
    setOpenCatalogKey('')
    setOpenArmyUid('')
    setPendingSquadUnidadId('')
    setArmyDownloadError('')
  }

  const handleSelectHero = (heroId) => {
    setSelectedHeroId(heroId)
    selectionCounterRef.current += 1
    const heroSelection = {
      selectionId: `heroe-${selectionCounterRef.current}`,
      kind: 'heroe',
      heroId,
      squadSize: 1,
      imageDataUrl: '',
    }
    // El héroe es único: sustituye al anterior y conserva el resto del ejército.
    setArmySelections((current) => [heroSelection, ...current.filter((selection) => selection.kind !== 'heroe')])
    setArmyDownloadError('')
  }

  const addUnitSelection = (unidadId, roleId, squadSize) => {
    selectionCounterRef.current += 1
    setArmySelections((current) => [
      ...current,
      {
        selectionId: `unidad-${selectionCounterRef.current}`,
        kind: 'unidad',
        unidadId,
        roleId,
        squadSize,
        imageDataUrl: '',
      },
    ])
    setArmyDownloadError('')
  }

  const handleAddUnit = (unidadId, roleId = getRoleFor(unidadId)) => {
    const unidad = getUnidad(unidadId)
    if (!unidad) return
    if (!selectedHeroId) {
      setArmyDownloadError(t('generator.chooseHeroFirst'))
      return
    }
    if (gameMode !== 'escuadra') {
      addUnitSelection(unidadId, roleId, 1)
      return
    }
    const { min, max } = unidad.perfil.escuadra
    if (min === max) {
      addUnitSelection(unidadId, roleId, min)
      return
    }
    setPendingSquadUnidadId(unidadId)
    setPendingSquadRoleId(roleId)
    setPendingSquadSize(min)
  }

  /** Quita la última unidad añadida de esa clase y rol. */
  const handleRemoveUnitByRole = (unidadId, roleId) => {
    setArmySelections((current) => {
      const index = current.map((selection) => (
        selection.kind === 'unidad' && selection.unidadId === unidadId && selection.roleId === roleId
      )).lastIndexOf(true)
      if (index === -1) return current
      return current.filter((_, position) => position !== index)
    })
  }

  const handleConfirmSquadSize = () => {
    if (!pendingSquadUnidadId) return
    addUnitSelection(pendingSquadUnidadId, pendingSquadRoleId, pendingSquadSize)
    setPendingSquadUnidadId('')
  }

  const handleRemoveArmyEntry = (selectionId) => {
    setArmySelections((current) => current.filter((selection) => selection.selectionId !== selectionId))
  }

  const handleResetCurrentArmy = () => {
    setArmySelections([])
    setSelectedHeroId('')
    setSelectedItems({})
    setArmyDownloadError('')
  }

  const handleAddItem = (itemId) => {
    setSelectedItems((prev) => {
      const count = prev[itemId] || 0
      if (count >= MAX_ITEM_COPIES) return prev
      return { ...prev, [itemId]: count + 1 }
    })
  }

  const handleRemoveItem = (itemId) => {
    setSelectedItems((prev) => {
      const count = prev[itemId] || 0
      if (count <= 1) {
        const { [itemId]: _removed, ...rest } = prev
        return rest
      }
      return { ...prev, [itemId]: count - 1 }
    })
  }

  const openItemFicha = (item) => {
    setActiveItemFicha({
      number: String(item.valor),
      title: item.nombre,
      flavor: '',
      // Notion ya no restringe objetos por clase: cualquier unidad puede equiparlos.
      summary: 'Cualquier unidad',
      copy: item.descripcion,
      meta: '',
      misionLabel: 'OBJETO',
      valorLabel: 'VALOR',
      objetivoLabel: 'Equipación',
    })
    setShowItemFichaModal(true)
  }

  // ── Imagen ──────────────────────────────────────────────────────────────
  const handleArmyUnitImageChange = (item, event) => {
    const file = event.target.files?.[0]
    if (!file) return
    readFileAsDataUrl(file)
      .then(async (sourceDataUrl) => {
        if (!sourceDataUrl) return
        const image = await loadImageFromDataUrl(sourceDataUrl)
        setImageCropDraft({
          selectionId: item.uid,
          unitName: item.entry.nombre,
          sourceDataUrl,
          imageWidth: image.naturalWidth || image.width || 1,
          imageHeight: image.naturalHeight || image.height || 1,
          zoom: 1,
          offsetX: 0,
          offsetY: 0,
        })
      })
      .catch(() => {})
    event.target.value = ''
  }

  const handleImageCropZoomChange = (nextZoom) => {
    setImageCropDraft((prev) => {
      if (!prev) return prev
      const zoom = Math.min(3, Math.max(1, Number(nextZoom) || 1))
      return { ...prev, zoom, ...clampCropOffsets({ ...prev, zoom }) }
    })
  }

  const handleImageCropPointerDown = (event) => {
    if (!imageCropDraft) return
    event.preventDefault()
    const startX = event.clientX
    const startY = event.clientY
    const startOffsetX = imageCropDraft.offsetX
    const startOffsetY = imageCropDraft.offsetY

    const handlePointerMove = (moveEvent) => {
      setImageCropDraft((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          ...clampCropOffsets({
            offsetX: startOffsetX + (moveEvent.clientX - startX),
            offsetY: startOffsetY + (moveEvent.clientY - startY),
            zoom: prev.zoom,
            imageWidth: prev.imageWidth,
            imageHeight: prev.imageHeight,
          }),
        }
      })
    }

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  const handleConfirmImageCrop = () => {
    if (!imageCropDraft) return
    createCroppedImageDataUrl(imageCropDraft.sourceDataUrl, imageCropDraft)
      .then((result) => {
        updateSelection(imageCropDraft.selectionId, { imageDataUrl: result })
        setImageCropDraft(null)
      })
      .catch(() => {})
  }

  // ── Bloqueo de scroll con modales abiertos ──────────────────────────────
  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const previousOverflow = document.body.style.overflow
    if (imageCropDraft || pendingSquadUnidadId) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [imageCropDraft, pendingSquadUnidadId])

  // ── Exportación a PDF del ejército ──────────────────────────────────────
  const handleDownloadArmyPdf = () => {
    if (!armyEntries.length || isArmyPrintPreviewOpen) return
    if (armyHeroEntries.length !== 1) {
      setArmyDownloadError(t('generator.requiredHero'))
      return
    }
    setArmyDownloadError('')
    setIsArmyPrintPreviewOpen(true)
  }

  useEffect(() => {
    if (!isArmyPrintPreviewOpen || !armyExportStageRef.current) return undefined

    let cancelled = false

    const renderArmyPdf = async () => {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

      const sheetNodes = armyExportPages
        .map((_, pageIndex) => armySheetRefs.current.get(`page-${pageIndex}`))
        .filter(Boolean)
      await waitForPrintReady(sheetNodes)

      if (cancelled || !armyExportStageRef.current) return

      const { jsPDF } = await import('jspdf')
      const capturedPageCanvases = []

      // Las capturas van en serie, no en paralelo: cada una marca su ficha en el
      // DOM para poder ajustarla al rasterizar, y solapándolas se pisaban entre sí.
      for (const [pageIndex, pageEntries] of armyExportPages.entries()) {
        const cardCanvases = []
        for (const [cardIndex, item] of pageEntries.entries()) {
          const cardKey = `unit-${pageIndex}-${item.uid || cardIndex}`
          const canvas = await armyCardRefs.current.get(cardKey)?.captureAsCanvas?.()
          if (!canvas) throw new Error(`Missing export card capture: ${cardKey}`)
          cardCanvases.push(canvas)
        }
        capturedPageCanvases.push(await renderExportPageCanvas(cardCanvases))
      }

      if (!capturedPageCanvases.length) {
        if (!cancelled) setIsArmyPrintPreviewOpen(false)
        return
      }

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      capturedPageCanvases.forEach((canvas, index) => {
        if (index > 0) doc.addPage()
        doc.addImage(canvas, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST')
      })

      doc.save('zerolore-ejercito.pdf')
      if (!cancelled) setIsArmyPrintPreviewOpen(false)
    }

    renderArmyPdf().catch((error) => {
      console.error('[generator] Army PDF export failed', error)
      if (!cancelled) setIsArmyPrintPreviewOpen(false)
    })

    return () => { cancelled = true }
  }, [isArmyPrintPreviewOpen, armyExportPages])

  const setArmySheetRef = (pageKey, node) => {
    if (!pageKey) return
    if (node) armySheetRefs.current.set(pageKey, node)
    else armySheetRefs.current.delete(pageKey)
  }

  const setArmyCardRef = (cardKey, node) => {
    if (!cardKey) return
    if (node) armyCardRefs.current.set(cardKey, node)
    else armyCardRefs.current.delete(cardKey)
  }

  // ── Ficha abierta en modal ──────────────────────────────────────────────
  const previewItem = useMemo(() => {
    if (openArmyUid) return armyEntries.find((item) => item.uid === openArmyUid) || null
    if (!openCatalogKey) return null
    if (openCatalogKey.startsWith('heroe:')) {
      const entry = buildHeroEntry(openCatalogKey.slice(6))
      return entry ? { uid: openCatalogKey, kind: 'heroe', entry, squadSize: 1, imageDataUrl: '' } : null
    }
    const unidadId = openCatalogKey.slice(7)
    const entry = buildUnitEntry(unidadId, roleByUnidad[unidadId] || DEFAULT_ROLE_ID)
    if (!entry) return null
    return {
      uid: openCatalogKey,
      kind: 'unidad',
      entry,
      squadSize: clampSquadSize(entry.perfil.escuadra.min, entry, gameMode),
      imageDataUrl: '',
    }
  }, [openArmyUid, openCatalogKey, armyEntries, roleByUnidad, gameMode])

  /** Cambia el rol desde el modal: en el catálogo o en la unidad ya añadida. */
  const handlePreviewRoleChange = (nextRole) => {
    if (!previewItem || previewItem.kind !== 'unidad') return
    if (openArmyUid) {
      updateSelection(openArmyUid, { roleId: nextRole })
      return
    }
    setRoleByUnidad((current) => ({ ...current, [previewItem.entry.unidadId]: nextRole }))
  }

  const previewRoleNames = useMemo(() => {
    if (previewItem?.kind !== 'unidad') return null
    const unidad = getUnidad(previewItem.entry.unidadId)
    if (!unidad) return null
    return Object.fromEntries(ROLES.map((role) => [role.id, unidad.roles[role.id]?.nombre || '']))
  }, [previewItem])

  const closePreview = () => {
    setOpenCatalogKey('')
    setOpenArmyUid('')
  }

  const handleDownloadModalFicha = async () => {
    if (!modalCardRef.current || !previewItem) return
    if (document.fonts?.ready) await document.fonts.ready
    const canvas = await modalCardRef.current.captureAsCanvas()
    if (!canvas) return
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const margin = 8
    const cardAspect = FICHA_CARD_W / FICHA_CARD_H
    let imgW = pageW - margin * 2
    let imgH = imgW / cardAspect
    if (imgH > pageH - margin * 2) {
      imgH = pageH - margin * 2
      imgW = imgH * cardAspect
    }
    doc.addImage(canvas, 'PNG', (pageW - imgW) / 2, (pageH - imgH) / 2, imgW, imgH, undefined, 'FAST')
    doc.save(`zerolore_${previewItem.entry.nombre || 'unidad'}.pdf`)
  }

  const pendingUnidad = pendingSquadUnidadId ? getUnidad(pendingSquadUnidadId) : null

  return (
    <section className="section generator-page reveal" id="generador">
      <div className="section-head reveal">
        <p className="eyebrow">{t('generator.eyebrow')}</p>
        <h2>{t('generator.title')}</h2>
        <p>{t('generator.subtitle')}</p>
      </div>

      <div className="generator-layout reveal">
        <div className="generator-main">
          <div className="manual-panel">
            <GameModePicker value={gameMode} onChange={handleGameModeChange} t={t} />

            <div className="generator-section-tabs" role="tablist" aria-label={t('generator.sectionTabs')}>
              <button
                type="button"
                role="tab"
                aria-selected={activeGeneratorSection === 'units'}
                className={`generator-section-tab${activeGeneratorSection === 'units' ? ' active' : ''}`}
                onClick={() => setActiveGeneratorSection('units')}
              >
                {t('generator.factionUnits')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeGeneratorSection === 'army'}
                className={`generator-section-tab${activeGeneratorSection === 'army' ? ' active' : ''}`}
                onClick={() => setActiveGeneratorSection('army')}
              >
                <span>{t('generator.currentArmy')}:</span>
                <span className="generator-section-tab-count">{currentArmyTotalValue} {t('generator.valueUnit')}</span>
              </button>
            </div>

            {activeGeneratorSection === 'units' ? (
              <div className="generator-subsection generator-listing-field">
                {/* Paso 1 — Héroe */}
                <div className="unit-list-section">
                  <p className="unit-list-section-label">{t('generator.heroes')}</p>
                  <div className="unit-list">
                    {HEROES.map((hero) => {
                      const isSelected = selectedHeroId === hero.id
                      return (
                        <article className={`unit-card${isSelected ? ' is-selected' : ''}`} key={hero.id}>
                          <div className="unit-card-header">
                            <div className="unit-card-summary">
                              <span className="unit-card-thumb-wrap" aria-hidden="true">
                                <span className="unit-card-thumb-frame">
                                  <span className="unit-card-thumb-canvas">
                                    {getUnitClassBadgeSrc('heroe') ? (
                                      <img className="unit-card-thumb fallback" src={getUnitClassBadgeSrc('heroe')} alt="" />
                                    ) : null}
                                  </span>
                                </span>
                              </span>
                              <div className="unit-card-heading">
                                <div className="unit-card-title-row"><h4>{hero.nombre}</h4></div>
                                <div className="unit-card-type unit-type-heroe">{t('generator.heroes')}</div>
                                <div className="unit-card-inline-value">{hero.perfil.valor} {t('generator.valueUnit')}</div>
                              </div>
                            </div>
                            <div className="unit-card-header-actions">
                              <button type="button" className="ghost small" onClick={() => setOpenCatalogKey(`heroe:${hero.id}`)}>
                                {t('generator.viewCard')}
                              </button>
                              <button
                                type="button"
                                className="ghost small"
                                disabled={isSelected}
                                onClick={() => handleSelectHero(hero.id)}
                              >
                                {isSelected ? t('generator.chosenHeroButton') : t('generator.chooseHeroButton')}
                              </button>
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </div>

                {/* Paso 2 — Unidades, solo tras elegir héroe */}
                {selectedHeroId ? (
                  <>
                    <hr className="generator-items-divider" />
                    <div className="unit-list-section">
                      <p className="unit-list-section-label">{t('generator.units')}</p>
                      <div className="unit-list">
                        {UNIDADES.map((unidad) => {
                          const unitDisabled = !isUnidadAllowedInGameMode(unidad.id, gameMode)
                          const roleNames = Object.fromEntries(
                            ROLES.map((role) => [role.id, unidad.roles[role.id]?.nombre || '']),
                          )
                          const roleCounts = Object.fromEntries(
                            ROLES.map((role) => [role.id, unitCountByKey.get(`${unidad.id}::${role.id}`) || 0]),
                          )
                          const count = Object.values(roleCounts).reduce((sum, value) => sum + value, 0)
                          return (
                            <article
                              className={`unit-card${count > 0 ? ' is-in-army' : ''}${unitDisabled ? ' is-disabled' : ''}`}
                              key={unidad.id}
                              title={unitDisabled ? t('generator.unitUnavailableInMode') : undefined}
                            >
                              <div className="unit-card-header">
                                <div className="unit-card-summary">
                                  <span className="unit-card-thumb-wrap" aria-hidden="true">
                                    <span className="unit-card-thumb-frame">
                                      <span className="unit-card-thumb-canvas">
                                        {getUnitClassBadgeSrc(unidad.id) ? (
                                          <img className="unit-card-thumb fallback" src={getUnitClassBadgeSrc(unidad.id)} alt="" />
                                        ) : null}
                                      </span>
                                    </span>
                                  </span>
                                  <div className="unit-card-heading">
                                    <div className={`unit-card-type unit-card-type-title unit-type-${getUnitClassToken(unidad.id)}`}>{unidad.clase}</div>
                                    <div className="unit-card-inline-value">{unidad.perfil.valor} {t('generator.valueUnit')}</div>
                                  </div>
                                </div>
                                <div className="unit-card-header-actions">
                                  <button type="button" className="ghost small" onClick={() => setOpenCatalogKey(`unidad:${unidad.id}`)}>
                                    {t('generator.viewCard')}
                                  </button>
                                </div>
                              </div>
                              <RoleRoster
                                counts={roleCounts}
                                names={roleNames}
                                disabled={unitDisabled}
                                addLabel={t('generator.add')}
                                removeLabel={t('generator.delete')}
                                onAdd={(nextRole) => {
                                  // El + fija además el rol que se abrirá al ver la ficha.
                                  setRoleByUnidad((current) => ({ ...current, [unidad.id]: nextRole }))
                                  handleAddUnit(unidad.id, nextRole)
                                }}
                                onRemove={(nextRole) => handleRemoveUnitByRole(unidad.id, nextRole)}
                              />
                            </article>
                          )
                        })}
                      </div>
                    </div>

                    <hr className="generator-items-divider" />
                    <div className="unit-list-section">
                      <p className="unit-list-section-label">{t('rules.modeItems')}</p>
                      <div className="unit-list">
                        {activeItems.map((item) => {
                          const itemCount = selectedItems[item.id] || 0
                          return (
                            <article key={item.id} className={`unit-card${itemCount > 0 ? ' is-in-army' : ''}`}>
                              <div className="unit-card-header">
                                <div className="unit-card-summary">
                                  <span className="unit-card-thumb-wrap" aria-hidden="true">
                                    <span className="unit-card-thumb-frame">
                                      <span className="unit-card-thumb-canvas">
                                        <img className="unit-card-thumb fallback" src={itemIcon} alt="" />
                                      </span>
                                    </span>
                                  </span>
                                  <div className="unit-card-heading">
                                    <div className="unit-card-title-row">
                                      <h4>{item.nombre}</h4>
                                    </div>
                                    <div className="unit-card-type unit-type-equipment">{t('rules.modeItems')}</div>
                                    <div className="unit-card-inline-value">{item.valor} {t('generator.valueUnit')}</div>
                                  </div>
                                </div>
                                <div className="unit-card-header-actions">
                                  <button type="button" className="ghost small" onClick={() => openItemFicha(item)}>
                                    {t('generator.viewCard')}
                                  </button>
                                </div>
                              </div>
                              <div className="unit-item-stepper-row">
                                <span className="unit-item-stepper-label">
                                  {t('generator.max')} {MAX_ITEM_COPIES}
                                </span>
                                <CountStepper
                                  count={itemCount}
                                  max={MAX_ITEM_COPIES}
                                  onAdd={() => handleAddItem(item.id)}
                                  onRemove={() => handleRemoveItem(item.id)}
                                  addLabel={`${t('generator.add')} ${item.nombre}`}
                                  removeLabel={`${t('generator.delete')} ${item.nombre}`}
                                />
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="empty-state">{t('generator.chooseHeroFirst')}</p>
                )}
              </div>
            ) : null}

            {activeGeneratorSection === 'army' ? (
              <div id="current-army-panel" className="generator-subsection generator-listing-field army-inline-panel">
                <div className="army-inline-head">
                  <p className="army-inline-total">
                    <span className="generator-listing-label">{t('generator.currentArmy')}:</span>{' '}
                    {currentArmyTotalValue} {t('generator.valueUnit')}
                  </p>
                </div>

                {[
                  { key: 'hero', label: t('generator.requiredHeroSlot'), rows: armyHeroEntries.map((item) => ({ item, count: 1, removeUid: item.uid })) },
                  {
                    key: 'units',
                    label: t('generator.units'),
                    rows: armyUnitGroups
                      ? armyUnitGroups.map(({ item, count, totalValue, uids }) => ({ item: { ...item, total: totalValue }, count, removeUid: uids.at(-1) }))
                      : armyUnitEntries.map((item) => ({ item, count: 1, removeUid: item.uid })),
                  },
                ].map((section) => section.rows.length ? (
                  <div className="army-modal-section" key={`current-army-${section.key}`}>
                    <p className="army-modal-section-label">{section.label}</p>
                    <div className="army-list army-list-compact">
                      {section.rows.map(({ item, count, removeUid }) => (
                        <article key={`army-row-${item.uid}`} className="unit-card army-unit">
                          <div className="unit-card-header army-unit-header">
                            <div className="unit-card-summary army-unit-summary">
                              <div className="unit-card-thumb-wrap army-unit-image-wrap">
                                <img
                                  className={`unit-card-thumb army-unit-thumb${item.imageDataUrl ? '' : ' fallback'}`}
                                  src={item.imageDataUrl || getUnitClassBadgeSrc(item.entry.unidadId || 'heroe')}
                                  alt={item.entry.clase}
                                />
                                <input
                                  id={`army-unit-image-${item.uid}`}
                                  type="file"
                                  accept="image/*"
                                  className="unit-image-input"
                                  onChange={(event) => handleArmyUnitImageChange(item, event)}
                                />
                                {item.imageDataUrl ? (
                                  <button
                                    type="button"
                                    className="unit-image-clear"
                                    onClick={() => updateSelection(item.uid, { imageDataUrl: '' })}
                                    aria-label={t('generator.removeImage')}
                                    title={t('generator.removeImage')}
                                  >
                                    ×
                                  </button>
                                ) : null}
                              </div>
                              <div className="unit-card-heading">
                                <div className={`unit-card-type unit-card-type-title unit-type-${getUnitClassToken(item.entry.unidadId || 'heroe')}`}>
                                  {item.kind === 'heroe' ? item.entry.nombre : item.entry.clase}
                                </div>
                                <div className="unit-card-inline-value">{item.total} {t('generator.valueUnit')}</div>
                              </div>
                            </div>
                            <div className="unit-card-header-actions army-unit-actions">
                              <label htmlFor={`army-unit-image-${item.uid}`} className="ghost small army-unit-image-button">
                                {item.imageDataUrl ? t('generator.changeImage') : t('generator.addImage')}
                              </label>
                              <button type="button" className="ghost small" onClick={() => setOpenArmyUid(item.uid)}>
                                {t('generator.viewCard')}
                              </button>
                              {item.kind === 'heroe' ? (
                                <button type="button" className="ghost small" onClick={() => handleRemoveArmyEntry(removeUid)}>
                                  {t('generator.delete')}
                                </button>
                              ) : null}
                            </div>
                          </div>
                          {item.kind === 'heroe' ? null : (
                            <div className="unit-role-roster">
                              <div className="unit-role-row has-count">
                                <span className="unit-role-name is-static">
                                  {item.entry.rol}
                                  {item.entry.nombreRol ? <span className="unit-role-flavour"> ({item.entry.nombreRol})</span> : null}
                                  {gameMode === 'escuadra'
                                    ? <span className="unit-role-flavour"> · {item.squadSize} {t('generator.squadLabel')}</span>
                                    : null}
                                </span>
                                <span className="unit-role-count">×{count}</span>
                              </div>
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null)}

                {Object.keys(selectedItems).length > 0 ? (
                  <div className="army-modal-section">
                    <p className="army-modal-section-label">{t('rules.modeItems')}</p>
                    <div className="army-list army-list-compact">
                      {activeItems.filter((item) => (selectedItems[item.id] || 0) > 0).map((item) => {
                        const count = selectedItems[item.id]
                        return (
                          <article key={item.id} className="unit-card army-unit">
                            <div className="unit-card-header army-unit-header">
                              <div className="unit-card-summary army-unit-summary">
                                <div className="unit-card-thumb-wrap army-unit-image-wrap">
                                  <img className="unit-card-thumb fallback" src={itemIcon} alt="" />
                                </div>
                                <div className="unit-card-heading">
                                  <div className="unit-card-title-row">
                                    <h4>{item.nombre}</h4>
                                    {count > 1 ? <span className="army-unit-count-badge">×{count}</span> : null}
                                  </div>
                                  <div className="unit-card-type unit-type-equipment">{t('rules.modeItems')}</div>
                                  <div className="unit-card-inline-value">{item.valor * count} {t('generator.valueUnit')}</div>
                                </div>
                              </div>
                              <div className="unit-card-header-actions army-unit-actions">
                                <button type="button" className="ghost small" onClick={() => openItemFicha(item)}>
                                  {t('generator.viewCard')}
                                </button>
                              </div>
                            </div>
                            <div className="unit-role-roster">
                              <div className="unit-role-row has-count">
                                <span className="unit-role-name is-static">{t('rules.modeItems')}</span>
                                <span className="unit-role-count">×{count}</span>
                              </div>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  </div>
                ) : null}

                {!armyEntries.length && !Object.keys(selectedItems).length ? (
                  <p className="empty-state">{t('generator.noUnitsYet')}</p>
                ) : null}

                <div className="army-actions">
                  <button
                    type="button"
                    className="primary small"
                    onClick={handleDownloadArmyPdf}
                    disabled={!armyEntries.length || isArmyPrintPreviewOpen}
                    aria-busy={isArmyPrintPreviewOpen ? 'true' : 'false'}
                  >
                    {isArmyPrintPreviewOpen ? <SpinnerIcon /> : null}
                    <span>{isArmyPrintPreviewOpen ? t('generator.preparingPdf') : t('generator.downloadArmy')}</span>
                  </button>
                  <button type="button" className="ghost small" onClick={handleResetCurrentArmy}>
                    {t('generator.resetArmy')}
                  </button>
                </div>

                {armyDownloadError ? (
                  <p className="random-army-error" role="alert" aria-live="polite">{armyDownloadError}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Modal de tamaño de escuadra */}
      {pendingUnidad && typeof document !== 'undefined' ? createPortal(
        (() => {
          const { min, max } = pendingUnidad.perfil.escuadra
          const sizeOptions = Array.from({ length: Math.max(1, max - min + 1) }, (_, index) => min + index)
          return (
            <div className="unit-modal" role="dialog" aria-modal="true" aria-label={t('generator.squadSize')} onClick={() => setPendingSquadUnidadId('')}>
              <div className="unit-modal-card squad-size-modal-card" onClick={(event) => event.stopPropagation()}>
                <div className="unit-modal-header">
                  <div>
                    <p className="eyebrow">{t('generator.squadLabel')}</p>
                    <h3>{pendingUnidad.clase}</h3>
                    <p className="unit-modal-subtitle">
                      {t('generator.squadSizeModalSubtitle').replace('{min}', String(min)).replace('{max}', String(max))}
                    </p>
                  </div>
                  <button type="button" className="ghost tiny" onClick={() => setPendingSquadUnidadId('')}>{t('generator.close')}</button>
                </div>
                <div className="squad-size-options" role="radiogroup" aria-label={t('generator.squadSize')}>
                  {sizeOptions.map((size) => (
                    <button
                      key={`squad-size-${size}`}
                      type="button"
                      className={`squad-size-option${pendingSquadSize === size ? ' active' : ''}`}
                      aria-pressed={pendingSquadSize === size}
                      onClick={() => setPendingSquadSize(size)}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                <p className="squad-size-total-preview">
                  <span>{pendingUnidad.perfil.valor * pendingSquadSize}</span> {t('generator.valueUnit')}
                </p>
                <div className="unit-modal-footer">
                  <button type="button" className="ghost small" onClick={() => setPendingSquadUnidadId('')}>{t('generator.cancel')}</button>
                  <button type="button" className="primary small" onClick={handleConfirmSquadSize}>{t('generator.add')}</button>
                </div>
              </div>
            </div>
          )
        })(),
        document.body,
      ) : null}

      {/* Modal de ficha */}
      {previewItem && typeof document !== 'undefined' ? createPortal(
        <div className="unit-preview-modal" role="dialog" aria-modal="true" aria-label={previewItem.entry.nombre} onClick={closePreview}>
          <div className="unit-preview-modal-inner" onClick={(event) => event.stopPropagation()}>
            <div className="unit-preview-modal-bar">
              {previewItem.kind === 'unidad' ? (
                <RolePicker
                  value={previewItem.entry.roleId}
                  names={previewRoleNames}
                  label={t('generator.chooseRole')}
                  onChange={handlePreviewRoleChange}
                />
              ) : <span />}
              <div className="unit-preview-modal-actions">
                <button type="button" className="ghost small" onClick={handleDownloadModalFicha}>
                  Descargar PDF
                </button>
                <button type="button" className="ghost small" onClick={closePreview} aria-label={t('generator.close')}>✕</button>
              </div>
            </div>
            <div className="unit-preview-modal-card">
              <UnitFichaCard
                ref={modalCardRef}
                entry={previewItem.entry}
                imageDataUrl={previewItem.imageDataUrl}
                gameMode={gameMode}
              />
            </div>
          </div>
        </div>,
        document.body,
      ) : null}

      {/* Escenario oculto para la exportación a PDF */}
      {isArmyPrintPreviewOpen ? (
        <div ref={armyExportStageRef} className="army-export-stage army-export-stage-hidden" aria-hidden="true">
          {armyExportPages.map((pageEntries, pageIndex) => (
            <div
              key={`army-export-page-${pageIndex}`}
              ref={(node) => setArmySheetRef(`page-${pageIndex}`, node)}
              className="army-export-sheet army-export-sheet-cards"
            >
              {pageEntries.map((item, cardIndex) => (
                <div key={`army-export-${item.uid}`} className="army-export-sheet-slot" data-army-export-slot={item.uid}>
                  <div className="army-export-card-host">
                    <UnitFichaCard
                      ref={(node) => setArmyCardRef(`unit-${pageIndex}-${item.uid || cardIndex}`, node)}
                      entry={item.entry}
                      imageDataUrl={item.imageDataUrl}
                      gameMode={gameMode}
                    />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null}

      {/* Modal de recorte de imagen */}
      {imageCropDraft && typeof document !== 'undefined' ? createPortal(
        <div className="unit-modal" role="dialog" aria-modal="true" onClick={() => setImageCropDraft(null)}>
          <div className="unit-modal-card image-crop-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="unit-modal-header">
              <div>
                <p className="eyebrow">{imageCropDraft.unitName}</p>
                <h3>{t('generator.cropImageTitle')}</h3>
                <p className="unit-modal-subtitle">{t('generator.cropImageHint')}</p>
              </div>
              <button type="button" className="ghost small" onClick={() => setImageCropDraft(null)}>{t('generator.close')}</button>
            </div>
            <div className="unit-modal-body image-crop-modal-body">
              <div
                className="image-crop-stage"
                onPointerDown={handleImageCropPointerDown}
                role="presentation"
                style={{ width: `${IMAGE_CROP_VIEWPORT_WIDTH}px`, height: `${IMAGE_CROP_VIEWPORT_HEIGHT}px` }}
              >
                <img
                  src={imageCropDraft.sourceDataUrl}
                  alt={imageCropDraft.unitName}
                  className="image-crop-stage-image"
                  draggable="false"
                  style={{
                    width: `${imageCropDraft.imageWidth}px`,
                    height: `${imageCropDraft.imageHeight}px`,
                    transform: `translate(calc(-50% + ${imageCropDraft.offsetX}px), calc(-50% + ${imageCropDraft.offsetY}px)) scale(${Math.max(
                      IMAGE_CROP_VIEWPORT_WIDTH / imageCropDraft.imageWidth,
                      IMAGE_CROP_VIEWPORT_HEIGHT / imageCropDraft.imageHeight,
                    ) * imageCropDraft.zoom})`,
                  }}
                />
                <div className="image-crop-frame" aria-hidden="true" />
              </div>
              <label className="field image-crop-zoom-field">
                <span>{t('generator.zoom')}</span>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={imageCropDraft.zoom}
                  onChange={(event) => handleImageCropZoomChange(event.target.value)}
                />
              </label>
              <div className="image-crop-actions">
                <button type="button" className="ghost small" onClick={() => setImageCropDraft(null)}>{t('generator.cancel')}</button>
                <button type="button" className="primary" onClick={handleConfirmImageCrop}>{t('generator.confirmCropImage')}</button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}

      {/* Modal de ficha de objeto */}
      {showItemFichaModal && activeItemFicha && typeof document !== 'undefined' ? createPortal(
        <div
          className="mision-ficha-modal-overlay"
          onClick={() => { setShowItemFichaModal(false); setActiveItemFicha(null) }}
          role="dialog"
          aria-modal="true"
        >
          <div className="mision-ficha-modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="mision-ficha-modal-bar">
              <button
                type="button"
                className="mision-ficha-modal-close"
                onClick={() => { setShowItemFichaModal(false); setActiveItemFicha(null) }}
                aria-label={t('generator.close')}
              >×</button>
            </div>
            <MissionFichaCard ficha={activeItemFicha} isItem />
          </div>
        </div>,
        document.body,
      ) : null}
    </section>
  )
}

export default Generador
