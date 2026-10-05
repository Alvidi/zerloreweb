import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n/I18nContext.jsx'
import UnitFichaCard from '../features/generator/components/UnitFichaCard.jsx'
import ItemFichaCard from '../features/generator/components/ItemFichaCard.jsx'
import itemIcon from '../images/units_icons/equipamiento.png'
import objetosData from '../data/items/objetos.json'
import { getUnitClassBadgeSrc, getUnitClassToken } from '../features/generator/unitTypeBadges.js'
import {
  UNIDADES,
  buildUnitEntry,
  getEntryValue,
  getUnidad,
} from '../features/generator/catalogUtils.js'

const MAX_UNIT_IMAGE_SIDE = 1600
const MAX_ITEM_COPIES = 3   // el reglamento permite hasta 3 copias del mismo objeto
/** Algunos objetos (como la Reliquia) tienen su propio límite por ejército. */
const getItemMaxCopies = (item) => item?.max_copias ?? MAX_ITEM_COPIES
const FICHA_CARD_W = 1536
const FICHA_CARD_H = 1024
const IMAGE_CROP_ASPECT_RATIO = 736 / 416   // ventana de arte de ficha2.png
const IMAGE_CROP_VIEWPORT_WIDTH = 360
const IMAGE_CROP_VIEWPORT_HEIGHT = Math.round(IMAGE_CROP_VIEWPORT_WIDTH / IMAGE_CROP_ASPECT_RATIO)
const EXPORT_PAGE_W = 1240  // A4 vertical (folio) ~210mm × 5.9px/mm
const EXPORT_PAGE_H = 1754  // A4 vertical (folio) ~297mm × 5.9px/mm
const EXPORT_MARGIN = 46    // ~8mm de margen
const EXPORT_GAP = 24       // ~4mm entre fichas
// Las fichas de unidad son apaisadas, así que en un A4 vertical se imprimen
// giradas 90°: 4 por folio en una rejilla de 2×2 que aprovecha el alto de la
// hoja (~139 mm de lado largo). Hay que girar el folio para leerlas.
// Los objetos siguen a tamaño carta (~95 mm), 6 por folio en 2×3.
const EXPORT_CARD_W_MM = 95
const CARDS_PER_PAGE = 4
const CARD_COLUMNS = 2
const ITEM_CARDS_PER_PAGE = 6
const ITEM_CARD_COLUMNS = 2
const EXPORT_PX_PER_MM = EXPORT_PAGE_W / 210
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

const renderExportPageCanvas = async (cardCanvases, { variant = 'unidad', scale = EXPORT_RASTER_SCALE } = {}) => {
  const pageCanvas = document.createElement('canvas')
  pageCanvas.width = EXPORT_PAGE_W * scale
  pageCanvas.height = EXPORT_PAGE_H * scale
  const ctx = pageCanvas.getContext('2d')
  ctx.scale(scale, scale)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.fillStyle = '#f8f5ed'
  ctx.fillRect(0, 0, EXPORT_PAGE_W, EXPORT_PAGE_H)

  // Los objetos van rectos a tamaño carta; las unidades, giradas 90° para que
  // 4 llenen el folio en vez de quedarse en la mitad de arriba.
  const isItemPage = variant === 'objeto'
  const cols = isItemPage ? ITEM_CARD_COLUMNS : CARD_COLUMNS
  const rows = Math.ceil((isItemPage ? ITEM_CARDS_PER_PAGE : CARDS_PER_PAGE) / cols)
  const gap = EXPORT_GAP
  const aspect = FICHA_CARD_W / FICHA_CARD_H
  const availableWidth = EXPORT_PAGE_W - EXPORT_MARGIN * 2 - gap * (cols - 1)
  const availableHeight = EXPORT_PAGE_H - EXPORT_MARGIN * 2 - gap * (rows - 1)

  // Hueco que ocupa cada ficha sobre el papel. Girada, el lado largo de la
  // ficha es el alto del hueco, así que la proporción se invierte.
  let slotWidth
  let slotHeight
  if (isItemPage) {
    slotWidth = Math.min(availableWidth / cols, Math.round(EXPORT_CARD_W_MM * EXPORT_PX_PER_MM))
    slotHeight = Math.floor(Math.min(availableHeight / rows, slotWidth / aspect))
    slotWidth = Math.round(slotHeight * aspect)
  } else {
    slotWidth = Math.floor(Math.min(availableWidth / cols, availableHeight / rows / aspect))
    slotHeight = Math.round(slotWidth * aspect)
  }

  const marginX = Math.round((EXPORT_PAGE_W - cols * slotWidth - gap * (cols - 1)) / 2)
  const marginY = Math.round((EXPORT_PAGE_H - rows * slotHeight - gap * (rows - 1)) / 2)

  cardCanvases.forEach((cardCanvas, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    const x = marginX + col * (slotWidth + gap)
    const y = marginY + row * (slotHeight + gap)

    if (isItemPage) {
      ctx.drawImage(cardCanvas, x, y, slotWidth, slotHeight)
      return
    }

    // Girada: se dibuja centrada en su hueco con el alto y el ancho cambiados.
    ctx.save()
    ctx.translate(x + slotWidth / 2, y + slotHeight / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.drawImage(cardCanvas, -slotHeight / 2, -slotWidth / 2, slotHeight, slotWidth)
    ctx.restore()
  })

  return pageCanvas
}

/**
 * El nombre del tipo encoge hasta caber en su hueco: se mide el texto y se baja
 * el tamaño de letra mientras desborde, así nunca se parte ni se sale.
 */
function UnitTypeTitle({ nombre, className }) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return undefined

    const fit = () => {
      const maxSize = 13.1   // 0.82rem, el tamaño por defecto de la etiqueta
      let size = maxSize
      node.style.fontSize = `${size}px`
      while (size > 8 && node.scrollWidth > node.clientWidth + 1) {
        size -= 0.5
        node.style.fontSize = `${size}px`
      }
    }

    fit()
    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(fit)
    observer.observe(node)
    return () => observer.disconnect()
  }, [nombre])

  return (
    <div ref={ref} className={className}>
      {nombre}
    </div>
  )
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
// ─── Página ───────────────────────────────────────────────────────────────
function Generador() {
  const { t } = useI18n()

  const [armySelections, setArmySelections] = useState([])
  const [selectedItems, setSelectedItems] = useState({})
  const [activeGeneratorSection, setActiveGeneratorSection] = useState('units')
  const [openCatalogKey, setOpenCatalogKey] = useState('')
  const [openArmyUid, setOpenArmyUid] = useState('')
  const [imageCropDraft, setImageCropDraft] = useState(null)
  // Qué PDF se está montando: 'ejercito', 'catalogo-unidades', 'catalogo-objetos' o ninguno.
  const [printJob, setPrintJob] = useState(null)
  const isArmyPrintPreviewOpen = printJob !== null
  const [armyDownloadError, setArmyDownloadError] = useState('')
  const [showItemFichaModal, setShowItemFichaModal] = useState(false)
  const [activeItemFicha, setActiveItemFicha] = useState(null)

  const armySheetRefs = useRef(new Map())
  const armyCardRefs = useRef(new Map())
  const armyExportStageRef = useRef(null)
  const selectionCounterRef = useRef(0)

  const activeItems = objetosData.objetos

  /** Entradas del ejército resueltas contra el catálogo. */
  const armyEntries = useMemo(
    () =>
      armySelections
        .map((selection) => {
          const entry = buildUnitEntry(selection.unidadId)
          if (!entry) return null
          return {
            uid: selection.selectionId,
            kind: 'unidad',
            entry,
            imageDataUrl: selection.imageDataUrl || '',
            total: getEntryValue(entry),
          }
        })
        .filter(Boolean),
    [armySelections],
  )

  const armyUnitEntries = armyEntries

  const selectedItemsTotalValue = useMemo(
    () => Object.entries(selectedItems).reduce((sum, [itemId, count]) => {
      const item = activeItems.find((candidate) => candidate.id === itemId)
      return sum + (Number(item?.valor) || 0) * count
    }, 0),
    [selectedItems, activeItems],
  )

  const currentArmyTotalValue = useMemo(
    () => armyEntries.reduce((sum, item) => sum + item.total, 0) + selectedItemsTotalValue,
    [armyEntries, selectedItemsTotalValue],
  )

  /** Se agrupan en la lista las unidades idénticas (mismo tipo y misma escuadra). */
  const armyUnitGroups = useMemo(() => {
    const groups = new Map()
    for (const item of armyUnitEntries) {
      const key = item.entry.unidadId
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
  }, [armyUnitEntries])

  /** Los objetos comprados también llevan su ficha al PDF, una por objeto. */
  const armyExportItems = useMemo(
    () => activeItems
      .filter((item) => (selectedItems[item.id] || 0) > 0)
      .map((item) => ({ uid: `objeto-${item.id}`, kind: 'objeto', item, count: selectedItems[item.id] })),
    [activeItems, selectedItems],
  )

  const armyExportEntries = useMemo(() => {
    const unidades = armyUnitGroups.map(({ item, count, totalValue }) => ({ ...item, _count: count, total: totalValue }))
    return [...unidades, ...armyExportItems]
  }, [armyUnitGroups, armyExportItems])

  /**
   * Catálogo completo, al margen del ejército montado. Van por separado porque
   * las dos descargas son independientes: fichas de unidad y cartas de objeto.
   */
  const catalogUnitEntries = useMemo(
    () => UNIDADES
      .map((unidad) => ({
        uid: `catalogo-unidad-${unidad.id}`,
        kind: 'unidad',
        entry: buildUnitEntry(unidad.id),
      }))
      .filter((item) => item.entry),
    [],
  )

  const catalogItemEntries = useMemo(
    () => objetosData.objetos.map((item) => ({
      uid: `catalogo-objeto-${item.id}`,
      kind: 'objeto',
      item,
      count: 0,
    })),
    [],
  )

  const exportEntries = printJob === 'catalogo-unidades'
    ? catalogUnitEntries
    : printJob === 'catalogo-objetos'
      ? catalogItemEntries
      : armyExportEntries

  /**
   * Los folios no mezclan tamaños: primero las páginas de unidades
   * (8 por folio) y luego las de objetos (6 por folio).
   */
  const armyExportPages = useMemo(() => {
    const grandes = exportEntries.filter((item) => item.kind !== 'objeto')
    const objetos = exportEntries.filter((item) => item.kind === 'objeto')
    return [
      ...chunkItems(grandes, CARDS_PER_PAGE).map((entries) => ({ variant: 'unidad', entries })),
      ...chunkItems(objetos, ITEM_CARDS_PER_PAGE).map((entries) => ({ variant: 'objeto', entries })),
    ]
  }, [exportEntries])

  const unitCountById = useMemo(() => {
    const counts = new Map()
    for (const item of armyUnitEntries) {
      counts.set(item.entry.unidadId, (counts.get(item.entry.unidadId) || 0) + 1)
    }
    return counts
  }, [armyUnitEntries])

  // ── Acciones ────────────────────────────────────────────────────────────
  const updateSelection = (selectionId, patch) => {
    setArmySelections((current) =>
      current.map((selection) => (selection.selectionId === selectionId ? { ...selection, ...patch } : selection)),
    )
  }

  const handleAddUnit = (unidadId) => {
    if (!getUnidad(unidadId)) return
    selectionCounterRef.current += 1
    setArmySelections((current) => [
      ...current,
      {
        selectionId: `unidad-${selectionCounterRef.current}`,
        kind: 'unidad',
        unidadId,
        imageDataUrl: '',
      },
    ])
    setArmyDownloadError('')
  }

  /** Quita la última unidad añadida de ese tipo. */
  const handleRemoveUnit = (unidadId) => {
    setArmySelections((current) => {
      const index = current.map((selection) => selection.unidadId === unidadId).lastIndexOf(true)
      if (index === -1) return current
      return current.filter((_, position) => position !== index)
    })
  }

  const handleResetCurrentArmy = () => {
    setArmySelections([])
    setSelectedItems({})
    setArmyDownloadError('')
  }

  const handleAddItem = (itemId) => {
    setSelectedItems((prev) => {
      const count = prev[itemId] || 0
      const item = activeItems.find((candidate) => candidate.id === itemId)
      if (count >= getItemMaxCopies(item)) return prev
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
    setActiveItemFicha(item)
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
    if (imageCropDraft) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [imageCropDraft])

  // ── Exportación a PDF del ejército ──────────────────────────────────────
  const handleDownloadArmyPdf = () => {
    if (!armyExportEntries.length || isArmyPrintPreviewOpen) return
    setArmyDownloadError('')
    setPrintJob('ejercito')
  }

  const handleDownloadCatalogPdf = (job) => {
    if (isArmyPrintPreviewOpen) return
    setArmyDownloadError('')
    setPrintJob(job)
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
      for (const [pageIndex, page] of armyExportPages.entries()) {
        const cardCanvases = []
        for (const [cardIndex, item] of page.entries.entries()) {
          const cardKey = `unit-${pageIndex}-${item.uid || cardIndex}`
          const canvas = await armyCardRefs.current.get(cardKey)?.captureAsCanvas?.()
          if (!canvas) throw new Error(`Missing export card capture: ${cardKey}`)
          cardCanvases.push(canvas)
        }
        capturedPageCanvases.push(await renderExportPageCanvas(cardCanvases, { variant: page.variant }))
      }

      if (!capturedPageCanvases.length) {
        if (!cancelled) setPrintJob(null)
        return
      }

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      // Las páginas van en JPEG de calidad alta, no en PNG: el roster completo son
      // 20 folios y en PNG el archivo se iba a ~80 MB. A esta resolución la pérdida
      // no se aprecia ni en pantalla ni impreso.
      capturedPageCanvases.forEach((canvas, index) => {
        if (index > 0) doc.addPage()
        doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST')
      })

      const fileName = printJob === 'catalogo-unidades'
        ? 'zerolore-unidades.pdf'
        : printJob === 'catalogo-objetos'
          ? 'zerolore-equipamiento.pdf'
          : 'zerolore-ejercito.pdf'
      doc.save(fileName)
      if (!cancelled) setPrintJob(null)
    }

    renderArmyPdf().catch((error) => {
      console.error('[generator] Army PDF export failed', error)
      if (!cancelled) setPrintJob(null)
    })

    return () => { cancelled = true }
  }, [isArmyPrintPreviewOpen, printJob, armyExportPages])

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
    const entry = buildUnitEntry(openCatalogKey.slice(7))
    if (!entry) return null
    return { uid: openCatalogKey, kind: 'unidad', entry, imageDataUrl: '' }
  }, [openArmyUid, openCatalogKey, armyEntries])

  const closePreview = () => {
    setOpenCatalogKey('')
    setOpenArmyUid('')
  }

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
                <div className="unit-list-section">
                  <div className="unit-list-section-head">
                    <p className="unit-list-section-label">{t('generator.units')}</p>
                    <button
                      type="button"
                      className="ghost small unit-list-section-download"
                      onClick={() => handleDownloadCatalogPdf('catalogo-unidades')}
                      disabled={isArmyPrintPreviewOpen}
                      aria-busy={printJob === 'catalogo-unidades' ? 'true' : 'false'}
                      title={t('generator.unitsPdfHint').replace('{count}', String(catalogUnitEntries.length))}
                    >
                      {printJob === 'catalogo-unidades' ? <SpinnerIcon /> : null}
                      <span>{printJob === 'catalogo-unidades' ? t('generator.preparingPdf') : t('generator.downloadUnits')}</span>
                    </button>
                  </div>
                  <div className="unit-list">
                    {UNIDADES.map((unidad) => {
                      const count = unitCountById.get(unidad.id) || 0
                      return (
                        <article
                          className={`unit-card${count > 0 ? ' is-in-army' : ''}`}
                          key={unidad.id}
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
                                <UnitTypeTitle
                                  nombre={unidad.nombre}
                                  className={`unit-card-type unit-card-type-title unit-type-${getUnitClassToken(unidad.id)}`}
                                />
                                <div className="unit-card-inline-value">{unidad.perfil.valor} {t('generator.valueUnit')}</div>
                              </div>
                            </div>
                            <div className="unit-card-header-actions">
                              <button type="button" className="ghost small" onClick={() => setOpenCatalogKey(`unidad:${unidad.id}`)}>
                                {t('generator.viewCard')}
                              </button>
                              <div className="unit-add-controls">
                                <CountStepper
                                  count={count}
                                  onAdd={() => handleAddUnit(unidad.id)}
                                  onRemove={() => handleRemoveUnit(unidad.id)}
                                  addLabel={`${t('generator.add')} ${unidad.nombre}`}
                                  removeLabel={`${t('generator.delete')} ${unidad.nombre}`}
                                  format={(value) => (value > 0 ? `×${value} ${t('generator.countUnits')}` : '0')}
                                />
                              </div>
                            </div>
                          </div>
                          {unidad.descripcion ? (
                            <p className="unit-card-blurb">{unidad.descripcion}</p>
                          ) : null}
                        </article>
                      )
                    })}
                  </div>
                </div>

                    <hr className="generator-items-divider" />
                    <div className="unit-list-section">
                      <div className="unit-list-section-head">
                        <p className="unit-list-section-label">{t('rules.modeItems')}</p>
                        <button
                          type="button"
                          className="ghost small unit-list-section-download"
                          onClick={() => handleDownloadCatalogPdf('catalogo-objetos')}
                          disabled={isArmyPrintPreviewOpen}
                          aria-busy={printJob === 'catalogo-objetos' ? 'true' : 'false'}
                          title={t('generator.itemsPdfHint').replace('{count}', String(catalogItemEntries.length))}
                        >
                          {printJob === 'catalogo-objetos' ? <SpinnerIcon /> : null}
                          <span>{printJob === 'catalogo-objetos' ? t('generator.preparingPdf') : t('generator.downloadItems')}</span>
                        </button>
                      </div>
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
                                    <div className="unit-card-inline-value">
                                      {item.valor === null ? '—' : `${item.valor} ${t('generator.valueUnit')}`}
                                    </div>
                                  </div>
                                </div>
                                <div className="unit-card-header-actions">
                                  <button type="button" className="ghost small" onClick={() => openItemFicha(item)}>
                                    {t('generator.viewCard')}
                                  </button>
                                  <div className="unit-add-controls">
                                    <CountStepper
                                      count={itemCount}
                                      max={getItemMaxCopies(item)}
                                      onAdd={() => handleAddItem(item.id)}
                                      onRemove={() => handleRemoveItem(item.id)}
                                      addLabel={`${t('generator.add')} ${item.nombre}`}
                                      removeLabel={`${t('generator.delete')} ${item.nombre}`}
                                      format={(value) => (value > 0 ? `×${value}` : '0')}
                                    />
                                  </div>
                                </div>
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    </div>
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
                  {
                    key: 'units',
                    label: t('generator.units'),
                    rows: armyUnitGroups.map(({ item, count, totalValue }) => (
                      { item: { ...item, total: totalValue }, count }
                    )),
                  },
                ].map((section) => section.rows.length ? (
                  <div className="army-modal-section" key={`current-army-${section.key}`}>
                    <p className="army-modal-section-label">{section.label}</p>
                    <div className="army-list army-list-compact">
                      {section.rows.map(({ item, count }) => (
                        <article key={`army-row-${item.uid}`} className="unit-card army-unit">
                          <div className="unit-card-header army-unit-header">
                            <div className="unit-card-summary army-unit-summary">
                              <div className="unit-card-thumb-wrap army-unit-image-wrap">
                                <img
                                  className={`unit-card-thumb army-unit-thumb${item.imageDataUrl ? '' : ' fallback'}`}
                                  src={item.imageDataUrl || getUnitClassBadgeSrc(item.entry.unidadId)}
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
                                <UnitTypeTitle
                                  nombre={item.entry.nombre}
                                  className={`unit-card-type unit-card-type-title unit-type-${getUnitClassToken(item.entry.unidadId)}`}
                                />
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
                              <div className="unit-add-controls">
                                <CountStepper
                                  count={count}
                                  onAdd={() => handleAddUnit(item.entry.unidadId)}
                                  onRemove={() => handleRemoveUnit(item.entry.unidadId)}
                                  addLabel={`${t('generator.add')} ${item.entry.nombre}`}
                                  removeLabel={`${t('generator.delete')} ${item.entry.nombre}`}
                                  format={(value) => (value > 0 ? `×${value} ${t('generator.countUnits')}` : '0')}
                                />
                              </div>
                            </div>
                          </div>
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
                                  <div className="unit-card-inline-value">
                                    {item.valor === null ? '—' : `${item.valor * count} ${t('generator.valueUnit')}`}
                                  </div>
                                </div>
                              </div>
                              <div className="unit-card-header-actions army-unit-actions">
                                <button type="button" className="ghost small" onClick={() => openItemFicha(item)}>
                                  {t('generator.viewCard')}
                                </button>
                                <div className="unit-add-controls">
                                  <CountStepper
                                    count={count}
                                    max={getItemMaxCopies(item)}
                                    onAdd={() => handleAddItem(item.id)}
                                    onRemove={() => handleRemoveItem(item.id)}
                                    addLabel={`${t('generator.add')} ${item.nombre}`}
                                    removeLabel={`${t('generator.delete')} ${item.nombre}`}
                                    format={(value) => (value > 0 ? `×${value}` : '0')}
                                  />
                                </div>
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
                    aria-busy={printJob === 'ejercito' ? 'true' : 'false'}
                  >
                    {printJob === 'ejercito' ? <SpinnerIcon /> : null}
                    <span>{printJob === 'ejercito' ? t('generator.preparingPdf') : t('generator.downloadArmy')}</span>
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

      {/* Modal de ficha */}
      {previewItem && typeof document !== 'undefined' ? createPortal(
        <div className="unit-preview-modal" role="dialog" aria-modal="true" aria-label={previewItem.entry.nombre} onClick={closePreview}>
          <div className="unit-preview-modal-inner" onClick={(event) => event.stopPropagation()}>
            <div className="unit-preview-modal-bar">
              <div className="unit-preview-modal-actions">
                <button type="button" className="ghost small" onClick={closePreview} aria-label={t('generator.close')}>✕</button>
              </div>
            </div>
            <div className="unit-preview-modal-card">
              <UnitFichaCard
                entry={previewItem.entry}
                imageDataUrl={previewItem.imageDataUrl}
              />
            </div>
          </div>
        </div>,
        document.body,
      ) : null}

      {/* Escenario oculto para la exportación a PDF */}
      {isArmyPrintPreviewOpen ? (
        <div ref={armyExportStageRef} className="army-export-stage army-export-stage-hidden" aria-hidden="true">
          {armyExportPages.map((page, pageIndex) => (
            <div
              key={`army-export-page-${pageIndex}`}
              ref={(node) => setArmySheetRef(`page-${pageIndex}`, node)}
              className="army-export-sheet army-export-sheet-cards"
            >
              {page.entries.map((item, cardIndex) => (
                <div key={`army-export-${item.uid}`} className="army-export-sheet-slot" data-army-export-slot={item.uid}>
                  <div className="army-export-card-host">
                    {item.kind === 'objeto' ? (
                      <ItemFichaCard
                        ref={(node) => setArmyCardRef(`unit-${pageIndex}-${item.uid || cardIndex}`, node)}
                        item={item.item}
                        count={item.count}
                      />
                    ) : (
                      <UnitFichaCard
                        ref={(node) => setArmyCardRef(`unit-${pageIndex}-${item.uid || cardIndex}`, node)}
                        entry={item.entry}
                        imageDataUrl={item.imageDataUrl}
                      />
                    )}
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
            <ItemFichaCard item={activeItemFicha} count={selectedItems[activeItemFicha.id] || 0} />
          </div>
        </div>,
        document.body,
      ) : null}
    </section>
  )
}

export default Generador
