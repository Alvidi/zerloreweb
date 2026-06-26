import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n/I18nContext.jsx'
import UnitFichaCard from '../features/generator/components/UnitFichaCard.jsx'
import { getAbilityDescription, getAbilityLabel } from '../utils/abilities.js'
import { buildLocalizedFactionEntries } from '../utils/factionLocalization.js'
import CustomSelect from '../features/generator/components/CustomSelect.jsx'
import { getUnitTypeBadgeSrc } from '../features/generator/unitTypeBadges.js'
import {
  buildArmyUnitDisplayNames,
  clampSquadSize,
  computeUnitTotal,
  formatSpeedValue,
  factionImages,
  generateArmyByValue,
  getFixedUnitLoadout,
  getUnitSpecialtyLabelForMode,
  isFactionData,
  isUnitTypeAllowedInGameMode,
  getUnitTypeToken,
  normalizeFaction,
} from '../features/generator/generatorUtils.js'

const factionModules = import.meta.glob(['../data/factions/jsonFaccionesES/*.json', '../data/factions/jsonFaccionesEN/*.en.json'], { eager: true })
const factionSheetTemplates = {
  orden: new URL('../images/fichas/ficha_orden.webp', import.meta.url).href,
  caos: new URL('../images/fichas/ficha_caos.webp', import.meta.url).href,
  legado: new URL('../images/fichas/ficha_legado.webp', import.meta.url).href,
}
const preferredUnitTypeOrder = ['line', 'elite', 'hero', 'monster', 'vehicle']
const MAX_UNIT_IMAGE_SIDE = 1600
const IMAGE_CROP_ASPECT_RATIO = 686 / 473
const IMAGE_CROP_VIEWPORT_WIDTH = 360
const IMAGE_CROP_VIEWPORT_HEIGHT = Math.round(IMAGE_CROP_VIEWPORT_WIDTH / IMAGE_CROP_ASPECT_RATIO)
const FICHA_CARD_W = 1537
const FICHA_CARD_H = 1023
const EXPORT_PAGE_W = 1754  // A4 landscape ~297mm × 5.9px/mm
const EXPORT_PAGE_H = 1240  // A4 landscape ~210mm × 5.9px/mm
const EXPORT_RASTER_SCALE = 2

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
  if (!imageWidth || !imageHeight) {
    return { offsetX: 0, offsetY: 0 }
  }

  const baseScale = Math.max(IMAGE_CROP_VIEWPORT_WIDTH / imageWidth, IMAGE_CROP_VIEWPORT_HEIGHT / imageHeight)
  const scaledWidth = imageWidth * baseScale * zoom
  const scaledHeight = imageHeight * baseScale * zoom
  const maxOffsetX = Math.max(0, (scaledWidth - IMAGE_CROP_VIEWPORT_WIDTH) / 2)
  const maxOffsetY = Math.max(0, (scaledHeight - IMAGE_CROP_VIEWPORT_HEIGHT) / 2)

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
  const drawX = (outputWidth - drawWidth) / 2 + cropState.offsetX * outputScale
  const drawY = (outputHeight - drawHeight) / 2 + cropState.offsetY * outputScale

  const canvas = document.createElement('canvas')
  canvas.width = outputWidth
  canvas.height = outputHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas context unavailable')
  }

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.clearRect(0, 0, outputWidth, outputHeight)
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight)

  return canvas.toDataURL('image/png')
}

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
  const images = Array.from(element.querySelectorAll('img'))
  await Promise.all(images.map((image) => {
    if (image.complete && image.naturalWidth > 0) return Promise.resolve()
    return new Promise((resolve) => {
      const done = () => resolve()
      image.addEventListener('load', done, { once: true })
      image.addEventListener('error', done, { once: true })
    })
  }))
}

const waitForPrintReady = async (elements = []) => {
  if (document.fonts?.ready) await document.fonts.ready
  for (const element of elements) {
    await waitForElementImages(element)
  }
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

const createArmyPdfFileName = (factionName = '') => {
  const slug = String(factionName || 'ejercito')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `zerolore-${slug || 'ejercito'}.pdf`
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

  // 2×2 grid, ~132×88mm por carta (plegada = ~66×88mm, tamaño Magic)
  const cols = 2
  const rows = 2
  const gap = 24  // ~4mm
  const cardHeight = 519  // ~88mm
  const cardWidth = Math.round(cardHeight * (FICHA_CARD_W / FICHA_CARD_H))  // ~780px (~132mm)
  const marginX = Math.round((EXPORT_PAGE_W - cols * cardWidth - gap * (cols - 1)) / 2)
  const marginY = Math.round((EXPORT_PAGE_H - rows * cardHeight - gap * (rows - 1)) / 2)

  cardCanvases.forEach((cardCanvas, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    const x = marginX + col * (cardWidth + gap)
    const y = marginY + row * (cardHeight + gap)
    ctx.drawImage(cardCanvas, x, y, cardWidth, cardHeight)
  })

  return pageCanvas
}

const getUnitEraTokens = (unit) => (Array.isArray(unit?.eras) ? unit.eras.map((era) => era.token).filter(Boolean) : [])

const getUnitTypeOrder = (type) => {
  const token = getUnitTypeToken(type)
  const match = preferredUnitTypeOrder.indexOf(token)
  return match === -1 ? preferredUnitTypeOrder.length : match
}

const getUnitSortValue = (unit) => {
  const value = Number(unit?.valor_base ?? unit?.valor ?? 0)
  return Number.isFinite(value) ? value : 0
}

const getUnitEraOrder = (unit) => {
  const eraToken = getUnitEraTokens(unit)[0] || ''
  if (eraToken === 'future') return 0
  if (eraToken === 'past') return 1
  return 2
}

const sortUnitsByType = (units) =>
  [...units].sort((a, b) => {
    const orderDiff = getUnitTypeOrder(a?.tipo) - getUnitTypeOrder(b?.tipo)
    if (orderDiff !== 0) return orderDiff
    const valueDiff = getUnitSortValue(a) - getUnitSortValue(b)
    if (valueDiff !== 0) return valueDiff
    return String(a?.nombre || '').localeCompare(String(b?.nombre || ''), 'es', { sensitivity: 'base' })
  })

const sortHeroUnitsByEra = (units) =>
  [...units].sort((a, b) => {
    const eraDiff = getUnitEraOrder(a) - getUnitEraOrder(b)
    if (eraDiff !== 0) return eraDiff
    const valueDiff = getUnitSortValue(a) - getUnitSortValue(b)
    if (valueDiff !== 0) return valueDiff
    return String(a?.nombre || '').localeCompare(String(b?.nombre || ''), 'es', { sensitivity: 'base' })
  })

const unitMatchesEraToken = (unit, eraToken) => {
  if (!eraToken) return true
  const eraTokens = getUnitEraTokens(unit)
  return !eraTokens.length || eraTokens.includes(eraToken)
}

const getUnitsForGeneratorContext = (faction) => sortUnitsByType(faction?.unidades || [])

const getGeneratorUnitUid = (unit, index) => {
  const eraKey = getUnitEraTokens(unit).join('-') || 'any'
  return `${unit?.id || `unit-${index}`}::${eraKey}::${index}`
}

const getUnitIdentityKey = (unit) => `${unit?.id || ''}::${getUnitEraTokens(unit).join('-') || 'any'}`

const isHeroUnit = (unit) => getUnitTypeToken(unit?.tipo) === 'hero'

const getSquadFichaValue = (unit, mode, squadSize) =>
  mode === 'escuadra' ? String(clampSquadSize(squadSize ?? unit?.escuadra_min, unit)) : '-'

const getUnitFichaValue = (unit, mode, totalValue) =>
  mode === 'escuadra' ? unit?.valor_base : (totalValue ?? unit?.valor_base)

const randomizeList = (items) => {
  const next = [...items]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  }
  return next
}

const createGeneratedUnitEntry = (unit, mode, era = '') => {
  const fixedLoadout = getFixedUnitLoadout(unit, era)
  const squadSize = mode === 'escuadra' ? clampSquadSize(unit.escuadra_min, unit) : 1
  return {
    uid: `${unit.id}-${Date.now()}-${Math.random()}`,
    base: unit,
    shooting: fixedLoadout.shooting,
    meleeList: fixedLoadout.meleeList,
    melee: fixedLoadout.melee,
    squadSize,
    perMiniLoadouts: null,
    total: computeUnitTotal(unit, fixedLoadout.shooting, fixedLoadout.melee, squadSize, null, mode),
  }
}

const generateArmyWithRequiredHero = (faction, target, mode, era = '') => {
  const visibleUnits = getUnitsForGeneratorContext(faction)
  const heroCandidates = visibleUnits.filter(isHeroUnit)
  if (!heroCandidates.length) return { units: [], total: 0, score: Number.NEGATIVE_INFINITY }

  let bestResult = null
  randomizeList(heroCandidates).forEach((hero) => {
    const heroEntry = createGeneratedUnitEntry(hero, mode, era)
    if (heroEntry.total > target) return

    const regularCandidates = visibleUnits.filter((unit) =>
      !isHeroUnit(unit) && isUnitTypeAllowedInGameMode(unit.tipo, mode),
    )
    const remainingTarget = Math.max(0, Math.floor(target - heroEntry.total))
    const regularResult = regularCandidates.length && remainingTarget > 0
      ? generateArmyByValue({ ...faction, unidades: regularCandidates }, remainingTarget, mode)
      : { units: [], total: 0, score: 0 }
    const units = [heroEntry, ...(regularResult.units || [])]
    const total = heroEntry.total + Number(regularResult.total || 0)
    const score = total + Number(regularResult.score || 0) / 10
    if (!bestResult || score > bestResult.score || (score === bestResult.score && total > bestResult.total)) {
      bestResult = { units, total, score }
    }
  })

  return bestResult || { units: [], total: 0, score: Number.NEGATIVE_INFINITY }
}

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
        {options.map((option) => {
          const isActive = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              className={`game-mode-card${isActive ? ' active' : ''}`}
              onClick={() => onChange(option.value)}
              role="radio"
              aria-checked={isActive}
            >
              <span className="game-mode-card-icon">
                <GameModeIcon mode={option.value} />
              </span>
              <span className="game-mode-card-label">{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const getFactionSheetTemplateSrc = (factionId) => factionSheetTemplates[factionId] || factionSheetTemplates.orden

const getWeaponAbilityNotes = (weapons, lang) =>
  (Array.isArray(weapons) ? weapons : []).flatMap((weapon) =>
    (weapon.habilidades || [])
      .map((ability) => ({
        key: `${weapon.nombre}-${ability}`,
        label: getAbilityLabel(ability, lang),
        description: getAbilityDescription(ability, lang),
        weaponName: weapon.nombre,
      }))
      .filter((item) => item.label),
  )

function UnitSheetTable({ weapons, emptyLabel = '-', lang }) {
  const rows = Array.isArray(weapons) && weapons.length ? weapons : [{ nombre: emptyLabel, ataques: '-', distancia: '-', impactos: '-', danio: '-', danio_critico: '-', habilidades: [] }]

  return (
    <div className="unit-sheet-table">
      {rows.map((weapon, index) => (
        <div className="unit-sheet-table-row" key={`${weapon.nombre}-${index}`}>
          <span>{weapon.nombre}</span>
          <span>{weapon.ataques}</span>
          <span>{weapon.distancia || '-'}</span>
          <span>{weapon.impactos || '-'}</span>
          <span>{`${weapon.danio}/${weapon.danio_critico}`}</span>
          <span>
            {weapon.habilidades?.length
              ? weapon.habilidades.map((ability) => getAbilityLabel(ability, lang)).join(', ')
              : '-'}
          </span>
        </div>
      ))}
    </div>
  )
}

function UnitSheetPreview({ unit, factionId, gameMode, draftTotal, imageDataUrl, fixedLoadout, t, lang }) {
  const templateSrc = getFactionSheetTemplateSrc(factionId)
  const factionLogoSrc = factionImages[factionId]
  const abilityNotes = getWeaponAbilityNotes(
    [...fixedLoadout.shooting, ...(fixedLoadout.meleeList || [])],
    lang,
  )
  const statValues = [
    unit.movimiento,
    unit.vidas,
    unit.salvacion,
    formatSpeedValue(unit.velocidad),
    gameMode === 'escuadra' ? `${unit.escuadra_min}-${unit.escuadra_max}` : '1',
  ]

  return (
    <div className="unit-sheet-preview-wrapper">
      <div className="unit-sheet-preview">
        <img className="unit-sheet-template" src={templateSrc} alt="" aria-hidden="true" />
        {factionLogoSrc ? (
          <div className="unit-sheet-slot unit-sheet-faction-mark" aria-hidden="true">
            <img src={factionLogoSrc} alt="" />
          </div>
        ) : (
          <div className="unit-sheet-slot unit-sheet-faction-mark unit-sheet-faction-mark-fallback" aria-hidden="true">
            ?
          </div>
        )}
        <div className="unit-sheet-slot unit-sheet-name">{unit.nombre}</div>
        <div className="unit-sheet-slot unit-sheet-type">{unit.tipo}</div>
        <div className="unit-sheet-slot unit-sheet-value">{draftTotal}</div>
        <div className="unit-sheet-slot unit-sheet-image-frame">
          <img
            className={`unit-sheet-image${imageDataUrl ? '' : ' fallback'}`}
            src={imageDataUrl || getUnitTypeBadgeSrc(unit.tipo, unit.eras)}
            alt={unit.nombre}
          />
        </div>
        <div className="unit-sheet-slot unit-sheet-stats">
          {statValues.map((value, index) => (
            <span key={`${unit.id}-sheet-stat-${index}`}>{value}</span>
          ))}
        </div>
        <div className="unit-sheet-slot unit-sheet-specialty">{getUnitSpecialtyLabelForMode(unit, gameMode, lang)}</div>
        <div className="unit-sheet-slot unit-sheet-shooting">
          <UnitSheetTable weapons={fixedLoadout.shooting} lang={lang} />
        </div>
        <div className="unit-sheet-slot unit-sheet-melee">
          <UnitSheetTable weapons={fixedLoadout.meleeList || []} lang={lang} />
        </div>
        <div className="unit-sheet-slot unit-sheet-abilities">
          {abilityNotes.length ? (
            abilityNotes.map((note) => (
              <p key={note.key}>
                <strong>{note.weaponName} · {note.label}:</strong> {note.description || t('generator.pendingDescription')}
              </p>
            ))
          ) : (
            <p>{t('generator.noWeaponsAvailable')}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function EraWorldPicker({ value, onChange, t }) {
  const options = [
    { value: 'future', label: t('generator.future'), className: 'era-world-button-future' },
    { value: 'past', label: t('generator.past'), className: 'era-world-button-past' },
  ]
  return (
    <div className="field field-era-worlds">
      <span>{t('generator.era')}</span>
      <div className="era-world-switch" role="radiogroup" aria-label={t('generator.era')}>
        {options.map((option) => {
          const isActive = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              className={`era-world-button ${option.className}${isActive ? ' active' : ''}`}
              onClick={() => onChange(option.value)}
              role="radio"
              aria-checked={isActive}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Generador() {
  const { t, lang } = useI18n()
  const [, startTransition] = useTransition()
  const factions = useMemo(() => {
    return buildLocalizedFactionEntries(factionModules, lang)
      .filter((item) => item && isFactionData(item.data))
      .map((item, index) => normalizeFaction(item.data, index, item.base))
  }, [lang])
  const [gameMode, setGameMode] = useState('escaramuza')
  const [selectedFactionId, setSelectedFactionId] = useState(factions[0]?.id || '')
  const [selectedEra, setSelectedEra] = useState('future')
  const [manualUnitDrafts, setManualUnitDrafts] = useState({})
  const [isArmyPrintPreviewOpen, setIsArmyPrintPreviewOpen] = useState(false)
  const [armyDownloadError, setArmyDownloadError] = useState('')
  const [isRandomArmyModalOpen, setIsRandomArmyModalOpen] = useState(false)
  const [randomArmyTargetValue, setRandomArmyTargetValue] = useState('')
  const [randomArmyError, setRandomArmyError] = useState('')
  const [isGeneratingArmy, setIsGeneratingArmy] = useState(false)
  const [pendingSquadUnitId, setPendingSquadUnitId] = useState('')
  const [pendingSquadSize, setPendingSquadSize] = useState(1)
  const [openManualUnitId, setOpenManualUnitId] = useState('')
  const [openArmyUnitUid, setOpenArmyUnitUid] = useState('')
  const [activeGeneratorSection, setActiveGeneratorSection] = useState('units')
  const [imageCropDraft, setImageCropDraft] = useState(null)
  const [selectedArmyUnitSelections, setSelectedArmyUnitSelections] = useState([])
  const armySheetRefs = useRef(new Map())
  const armyCardRefs = useRef(new Map())
  const armyExportStageRef = useRef(null)
  const armyUnitSelectionCounterRef = useRef(0)
  const getEraLabel = useCallback((token) => (token === 'future' ? t('generator.future') : t('generator.past')), [t])
  const selectedFactionIdSafe = useMemo(() => {
    if (!factions.length) return ''
    return factions.some((faction) => faction.id === selectedFactionId) ? selectedFactionId : factions[0].id
  }, [factions, selectedFactionId])

  const selectedFaction = factions.find((faction) => faction.id === selectedFactionIdSafe) || null
  const factionSelectOptions = useMemo(
    () => factions.map((faction) => ({ value: faction.id, label: faction.nombre })),
    [factions],
  )
  const visibleManualUnits = useMemo(() => {
    if (!selectedFaction?.unidades?.length) return []
    return getUnitsForGeneratorContext(selectedFaction).map((unit, index) => ({
      ...unit,
      generatorUid: getGeneratorUnitUid(unit, index),
    }))
  }, [selectedFaction])
  const visibleHeroUnits = useMemo(
    () => sortHeroUnitsByEra(visibleManualUnits.filter(isHeroUnit)),
    [visibleManualUnits],
  )
  const visibleRegularUnits = useMemo(
    () => visibleManualUnits.filter((unit) => !isHeroUnit(unit)),
    [visibleManualUnits],
  )

  const getManualUnitDraft = (unit) => {
    const draft = manualUnitDrafts[unit.generatorUid || unit.id] || {}
    return {
      squadSize: gameMode === 'escuadra' ? clampSquadSize(draft.squadSize ?? unit.escuadra_min, unit) : 1,
    }
  }

  const exportUnits = useMemo(
    () =>
      visibleManualUnits.map((unit) => {
        const draft = manualUnitDrafts[unit.generatorUid || unit.id] || {}
        const squadSize = gameMode === 'escuadra' ? clampSquadSize(draft.squadSize ?? unit.escuadra_min, unit) : 1
        const fixedLoadout = getFixedUnitLoadout(unit, selectedEra)
        const total = computeUnitTotal(unit, fixedLoadout.shooting, fixedLoadout.melee, squadSize, null, gameMode)
        return {
          uid: unit.generatorUid || unit.id,
          base: unit,
          shooting: fixedLoadout.shooting,
          meleeList: fixedLoadout.meleeList,
          melee: fixedLoadout.melee,
          squadSize,
          perMiniLoadouts: null,
          imageDataUrl: '',
          total,
        }
      }),
    [visibleManualUnits, manualUnitDrafts, gameMode, selectedEra],
  )
  const selectedArmyUnits = useMemo(() => {
    const unitsById = new Map(exportUnits.map((unit) => [unit.uid, unit]))
    return selectedArmyUnitSelections
      .map((selection) => {
        const unit = unitsById.get(selection.unitId)
        if (!unit) return null
        return {
          ...unit,
          ...selection,
          uid: selection.selectionId,
          sourceUid: unit.uid,
          imageDataUrl: selection.imageDataUrl || '',
          squadSize: selection.squadSize ?? unit.squadSize,
          total: computeUnitTotal(
            unit.base,
            unit.shooting,
            unit.melee,
            selection.squadSize ?? unit.squadSize,
            unit.perMiniLoadouts,
            gameMode,
          ),
        }
      })
      .filter(Boolean)
  }, [exportUnits, selectedArmyUnitSelections, gameMode])
  const selectedHeroEntries = useMemo(() => selectedArmyUnits.filter((entry) => isHeroUnit(entry.base)), [selectedArmyUnits])
  const selectedRegularArmyUnits = useMemo(() => selectedArmyUnits.filter((entry) => !isHeroUnit(entry.base)), [selectedArmyUnits])
  const selectedHeroCount = selectedHeroEntries.length
  const selectedHeroSourceUid = selectedHeroEntries[0]?.sourceUid || ''
  const regularUnitCountMap = useMemo(() => {
    const map = new Map()
    for (const entry of selectedRegularArmyUnits) {
      map.set(entry.sourceUid, (map.get(entry.sourceUid) || 0) + 1)
    }
    return map
  }, [selectedRegularArmyUnits])
  const visibleUnlockedRegularUnits = useMemo(
    () => (selectedHeroCount > 0 ? visibleRegularUnits : []),
    [selectedHeroCount, visibleRegularUnits],
  )
  const exportUnitDisplayNames = useMemo(() => buildArmyUnitDisplayNames(selectedArmyUnits), [selectedArmyUnits])
  const currentArmyTotalValue = useMemo(
    () => selectedArmyUnits.reduce((sum, unit) => sum + Number(unit?.total || 0), 0),
    [selectedArmyUnits],
  )

  const armyRegularUnitGroups = useMemo(() => {
    if (gameMode !== 'escaramuza') return null
    const groups = new Map()
    for (const entry of selectedRegularArmyUnits) {
      const key = entry.sourceUid
      if (groups.has(key)) {
        const g = groups.get(key)
        g.count += 1
        g.totalValue += entry.total
        g.selectionIds.push(entry.uid)
      } else {
        groups.set(key, { entry, count: 1, totalValue: entry.total, selectionIds: [entry.uid] })
      }
    }
    return Array.from(groups.values())
  }, [gameMode, selectedRegularArmyUnits])

  const armyExportEntries = useMemo(() => {
    if (gameMode !== 'escaramuza' || !armyRegularUnitGroups) return selectedArmyUnits
    return [
      ...selectedHeroEntries,
      ...armyRegularUnitGroups.map(({ entry, count, totalValue }) => ({
        ...entry,
        _count: count,
        total: totalValue,
      })),
    ]
  }, [gameMode, armyRegularUnitGroups, selectedArmyUnits, selectedHeroEntries])

  const armyExportPages = useMemo(() => chunkItems(armyExportEntries, 4), [armyExportEntries])

  const updateArmyUnitSelection = (selectionId, nextPatch) => {
    setSelectedArmyUnitSelections((current) =>
      current.map((selection) => (selection.selectionId === selectionId ? { ...selection, ...nextPatch } : selection)),
    )
  }

  const getUnitUnlockDisabledReason = (unit) => {
    if (isHeroUnit(unit)) return ''
    if (!isUnitTypeAllowedInGameMode(unit.tipo, gameMode)) return t('generator.unitUnavailableInMode')
    return ''
  }

  const handleArmyUnitImageChange = (entry, event) => {
    const file = event.target.files?.[0]
    if (!file) return
    readFileAsDataUrl(file)
      .then(async (sourceDataUrl) => {
        if (!sourceDataUrl) return
        const image = await loadImageFromDataUrl(sourceDataUrl)
        const imageWidth = image.naturalWidth || image.width || 1
        const imageHeight = image.naturalHeight || image.height || 1
        setImageCropDraft({
          selectionId: entry.uid,
          unitName: exportUnitDisplayNames.get(entry.uid) || entry.base.nombre,
          sourceDataUrl,
          imageWidth,
          imageHeight,
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
      const nextOffsets = clampCropOffsets({
        offsetX: prev.offsetX,
        offsetY: prev.offsetY,
        zoom,
        imageWidth: prev.imageWidth,
        imageHeight: prev.imageHeight,
      })
      return {
        ...prev,
        zoom,
        ...nextOffsets,
      }
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
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY

      setImageCropDraft((prev) => {
        if (!prev) return prev
        const nextOffsets = clampCropOffsets({
          offsetX: startOffsetX + deltaX,
          offsetY: startOffsetY + deltaY,
          zoom: prev.zoom,
          imageWidth: prev.imageWidth,
          imageHeight: prev.imageHeight,
        })
        return {
          ...prev,
          ...nextOffsets,
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

  const handleCancelImageCrop = () => {
    setImageCropDraft(null)
  }

  const handleConfirmImageCrop = () => {
    if (!imageCropDraft) return
    createCroppedImageDataUrl(imageCropDraft.sourceDataUrl, imageCropDraft)
      .then((result) => {
        updateArmyUnitSelection(imageCropDraft.selectionId, { imageDataUrl: result })
        setImageCropDraft(null)
      })
      .catch(() => {})
  }

  useEffect(() => {
    if (typeof Image === 'undefined') return
    ;[...Object.values(factionImages), ...Object.values(factionSheetTemplates)].forEach((src) => {
      const img = new Image()
      img.src = src
    })
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const hasOpenModal = Boolean(imageCropDraft || isRandomArmyModalOpen || pendingSquadUnitId)
    const previousOverflow = document.body.style.overflow
    if (hasOpenModal) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [imageCropDraft, isRandomArmyModalOpen, pendingSquadUnitId])

  useEffect(() => {
    if (!isArmyPrintPreviewOpen) return undefined

    const preparePreview = async () => {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      const sheetNodes = []
      armyExportPages.forEach((_, pageIndex) => {
        const pageNode = armySheetRefs.current.get(`page-${pageIndex}`)
        if (pageNode) sheetNodes.push(pageNode)
      })
      await waitForPrintReady(sheetNodes)
    }

    preparePreview().catch(() => {})

    return undefined
  }, [isArmyPrintPreviewOpen, armyExportPages])

  useEffect(() => {
    if (!isArmyPrintPreviewOpen || !armyExportStageRef.current) return undefined

    let cancelled = false

    const renderArmyPdf = async () => {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

      const sheetNodes = []
      armyExportPages.forEach((_, pageIndex) => {
        const pageNode = armySheetRefs.current.get(`page-${pageIndex}`)
        if (pageNode) sheetNodes.push(pageNode)
      })
      await waitForPrintReady(sheetNodes)

      if (cancelled || !armyExportStageRef.current) return

      const { jsPDF } = await import('jspdf')
      const capturedPageCanvases = []
      const captureCardCanvas = async (cardKey) => {
        const cardRef = armyCardRefs.current.get(cardKey)
        const canvas = await cardRef?.captureAsCanvas?.()
        if (!canvas) throw new Error(`Missing export card capture: ${cardKey}`)
        return canvas
      }

      for (const [pageIndex, pageEntries] of armyExportPages.entries()) {
        const cardCanvases = await Promise.all(pageEntries.map((entry, cardIndex) =>
          captureCardCanvas(`unit-${pageIndex}-${entry.uid || cardIndex}`),
        ))
        capturedPageCanvases.push(await renderExportPageCanvas(cardCanvases))
      }

      if (!capturedPageCanvases.length) {
        if (!cancelled) setIsArmyPrintPreviewOpen(false)
        return
      }

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true,
      })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      capturedPageCanvases.forEach((canvas, index) => {
        if (index > 0) doc.addPage()
        doc.addImage(canvas, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST')
      })

      const pdfFileName = createArmyPdfFileName(selectedFaction?.nombre || 'ZeroLore')
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      if (isIOS) {
        window.location.href = doc.output('bloburl')
      } else {
        doc.save(pdfFileName)
      }
      if (!cancelled) {
        setIsArmyPrintPreviewOpen(false)
      }
    }

    renderArmyPdf().catch((error) => {
      console.error('[generator] Army PDF export failed', error)
      if (!cancelled) {
        setIsArmyPrintPreviewOpen(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [isArmyPrintPreviewOpen, armyExportPages, selectedFaction, gameMode, lang, exportUnitDisplayNames, getEraLabel])

  const handleFactionChange = (event) => {
    const next = event.target.value
    setSelectedFactionId(next)
    setSelectedEra('')
    setOpenManualUnitId('')
    setOpenArmyUnitUid('')
    setPendingSquadUnitId('')
    setSelectedArmyUnitSelections([])
    setManualUnitDrafts({})
    setArmyDownloadError('')
  }

  const handleGameModeChange = (nextMode) => {
    setGameMode(nextMode)
    setOpenManualUnitId('')
    setOpenArmyUnitUid('')
    setPendingSquadUnitId('')
    setSelectedArmyUnitSelections([])
  }

  const handleEraChange = (nextEra) => {
    if (nextEra === selectedEra) return
    setSelectedEra(nextEra)
    setActiveGeneratorSection('units')
    setOpenManualUnitId('')
    setOpenArmyUnitUid('')
    setPendingSquadUnitId('')
    setSelectedArmyUnitSelections([])
    setArmyDownloadError('')
  }

  const handleSelectHeroUnit = (unitId) => {
    const unitEntry = exportUnits.find((entry) => entry.uid === unitId)
    if (!unitEntry || !isHeroUnit(unitEntry.base)) return
    if (selectedHeroSourceUid === unitEntry.uid) return

    armyUnitSelectionCounterRef.current += 1
    const heroSelection = {
      selectionId: `${unitId}::${armyUnitSelectionCounterRef.current}`,
      unitId,
      squadSize: 1,
    }

    setSelectedArmyUnitSelections([heroSelection])
    setPendingSquadUnitId('')
    setOpenArmyUnitUid('')
    setArmyDownloadError('')
  }

  const addArmyUnitSelection = (unitId, squadSize) => {
    const unitEntry = exportUnits.find((entry) => entry.uid === unitId)
    if (unitEntry && isHeroUnit(unitEntry.base) && selectedHeroCount >= 1) {
      setArmyDownloadError(t('generator.heroAlreadyAdded'))
      return false
    }
    if (unitEntry && !isHeroUnit(unitEntry.base)) {
      const unlockDisabledReason = getUnitUnlockDisabledReason(unitEntry.base)
      if (unlockDisabledReason) {
        setArmyDownloadError(unlockDisabledReason)
        return false
      }
    }
    armyUnitSelectionCounterRef.current += 1
    const selectionId = `${unitId}::${armyUnitSelectionCounterRef.current}`
    setSelectedArmyUnitSelections((current) => [...current, { selectionId, unitId, squadSize }])
    setArmyDownloadError('')
    return true
  }

  const handleAddArmyUnit = (unitId) => {
    const unitEntry = exportUnits.find((entry) => entry.uid === unitId)
    if (!unitEntry) return
    if (isHeroUnit(unitEntry.base)) {
      handleSelectHeroUnit(unitId)
      return
    }
    const unlockDisabledReason = getUnitUnlockDisabledReason(unitEntry.base)
    if (unlockDisabledReason) {
      setArmyDownloadError(unlockDisabledReason)
      return
    }
    if (gameMode !== 'escuadra') {
      addArmyUnitSelection(unitId, 1)
      return
    }
    const min = clampSquadSize(unitEntry.base.escuadra_min, unitEntry.base)
    const max = clampSquadSize(unitEntry.base.escuadra_max, unitEntry.base)
    if (min === max) {
      addArmyUnitSelection(unitId, min)
      return
    }
    setPendingSquadUnitId(unitId)
    setPendingSquadSize(clampSquadSize(unitEntry.squadSize ?? min, unitEntry.base))
  }

  const handleCloseSquadSizeModal = () => {
    setPendingSquadUnitId('')
  }

  const handleConfirmSquadSize = () => {
    if (!pendingSquadUnitId) return
    const unitEntry = exportUnits.find((entry) => entry.uid === pendingSquadUnitId)
    if (!unitEntry) return
    if (addArmyUnitSelection(pendingSquadUnitId, clampSquadSize(pendingSquadSize, unitEntry.base))) {
      setPendingSquadUnitId('')
    }
  }

  const handleRemoveArmyUnit = (selectionId) => {
    const removed = selectedArmyUnitSelections.find((s) => s.selectionId === selectionId)
    const removedUnit = removed ? exportUnits.find((e) => e.uid === removed.unitId) : null
    if (removedUnit && isHeroUnit(removedUnit.base)) {
    }
    setSelectedArmyUnitSelections((current) => current.filter((selection) => selection.selectionId !== selectionId))
  }

  const handleResetCurrentArmy = () => {
    setSelectedArmyUnitSelections([])
    setArmyDownloadError('')
  }

  const createArmyUnitSelection = (unitId, patch = {}) => {
    armyUnitSelectionCounterRef.current += 1
    return {
      selectionId: `${unitId}::${armyUnitSelectionCounterRef.current}`,
      unitId,
      ...patch,
    }
  }

  const handleOpenRandomArmyModal = () => {
    setRandomArmyTargetValue(String(currentArmyTotalValue || (gameMode === 'escuadra' ? 100 : 50)))
    setRandomArmyError('')
    setIsRandomArmyModalOpen(true)
  }

  const handleCloseRandomArmyModal = () => {
    setIsRandomArmyModalOpen(false)
    setRandomArmyError('')
  }

  const handleGenerateRandomArmy = (event) => {
    event.preventDefault()
    const target = Number(randomArmyTargetValue)
    if (!Number.isFinite(target) || target <= 0) {
      setRandomArmyError(t('generator.randomArmyInvalidValue'))
      return
    }

    setIsGeneratingArmy(true)

    setTimeout(() => {
      const eraFilteredFaction = selectedEra
        ? { ...selectedFaction, unidades: selectedFaction.unidades.filter((unit) => unitMatchesEraToken(unit, selectedEra)) }
        : selectedFaction

      let bestResult = null
      const attempts = 24
      for (let index = 0; index < attempts; index += 1) {
        const result = generateArmyWithRequiredHero(eraFilteredFaction, target, gameMode, selectedEra)
        if (!result.units.length) continue

        const total = result.total
        const score = total + (result.score || 0) / 10
        if (!bestResult || score > bestResult.score) {
          bestResult = { ...result, total, score }
        }
      }

      setIsGeneratingArmy(false)

      if (!bestResult?.units?.length) {
        setRandomArmyError(t('generator.randomArmyNoResult'))
        return
      }

      const exportUnitByIdentity = new Map(exportUnits.map((entry) => [getUnitIdentityKey(entry.base), entry.uid]))
      setSelectedArmyUnitSelections(
        bestResult.units
          .filter((entry) => entry?.base?.id)
          .map((entry) => {
            const unitId = exportUnitByIdentity.get(getUnitIdentityKey(entry.base)) || entry.base.id
            return createArmyUnitSelection(unitId, { squadSize: entry.squadSize })
          }),
      )
      setActiveGeneratorSection('army')
      setIsRandomArmyModalOpen(false)
      setRandomArmyError('')
    }, 0)
  }

  useEffect(() => {
    const availableIds = new Set(exportUnits.map((unit) => unit.uid))
    const timeoutId = window.setTimeout(() => {
      setSelectedArmyUnitSelections((current) => current.filter((selection) => availableIds.has(selection.unitId)))
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [exportUnits])

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

  const handleDownloadArmyPdf = () => {
    if (!selectedArmyUnits.length || isArmyPrintPreviewOpen) return
    if (selectedHeroCount !== 1) {
      setArmyDownloadError(selectedHeroCount > 1 ? t('generator.singleHeroRequired') : t('generator.requiredHero'))
      return
    }
    if (typeof window === 'undefined') return
    setArmyDownloadError('')
    setIsArmyPrintPreviewOpen(true)
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
            <GameModePicker value={gameMode} onChange={handleGameModeChange} t={t} />

            {selectedFaction && (
              <>
                <div className="faction-summary">
                  <div className="field faction-summary-select">
                    <span>{t('generator.faction')}</span>
                    <CustomSelect
                      t={t}
                      value={selectedFactionIdSafe}
                      onChange={(next) => handleFactionChange({ target: { value: next } })}
                      options={factionSelectOptions}
                    />
                  </div>
                  <div className="faction-summary-main">
                    <div className="faction-header">
                      {factionImages[selectedFaction.id] ? (
                        <img src={factionImages[selectedFaction.id]} alt={selectedFaction.nombre} loading="lazy" />
                      ) : (
                        <span className="faction-header-fallback" aria-hidden="true">?</span>
                      )}
                      <div className="faction-heading-copy">
                        <p className="faction-description">{selectedFaction.estilo}</p>
                      </div>
                    </div>
                  </div>
                  <EraWorldPicker value={selectedEra} onChange={handleEraChange} t={t} />
                </div>
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
                    className="generator-section-tab"
                    onClick={handleOpenRandomArmyModal}
                  >
                    {t('generator.randomArmy')}
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
                  {[
                    { key: 'heroes', label: t('generator.heroes'), units: visibleHeroUnits },
                    {
                      key: 'units',
                      label: t('generator.units'),
                      units: visibleUnlockedRegularUnits,
                    },
                  ].map((section) => section.units.length ? (
                    <div className="unit-list-section" key={`manual-${section.key}`}>
                      <p className="unit-list-section-label">{section.label}</p>
                      <div className="unit-list">
                        {section.units.map((unit) => {
                          const draft = getManualUnitDraft(unit)
                          const fixedLoadout = getFixedUnitLoadout(unit, selectedEra)
                          const draftTotal = computeUnitTotal(unit, fixedLoadout.shooting, fixedLoadout.melee, draft.squadSize, null, gameMode)
                          const displayValue = gameMode === 'escuadra' ? unit.valor_base : draftTotal
                          const unitIsHero = isHeroUnit(unit)
                          const unitKey = unit.generatorUid || unit.id
                          const isSelectedHero = unitIsHero && selectedHeroSourceUid === unitKey
                          const unitCount = !unitIsHero ? (regularUnitCountMap.get(unitKey) || 0) : 0
                          const unlockDisabledReason = getUnitUnlockDisabledReason(unit)
                          const unitDisabled = !unitIsHero && Boolean(unlockDisabledReason)
                          const disabledTitle = unlockDisabledReason
                          return (
                            <article className={`unit-card${unitDisabled ? ' is-disabled' : ''}${isSelectedHero ? ' is-selected' : ''}${unitCount > 0 ? ' is-in-army' : ''}`} key={unitKey}>
                              <div className="unit-card-header">
                                <div className="unit-card-summary">
                                  <span className="unit-card-thumb-wrap" aria-hidden="true">
                                    <span className="unit-card-thumb-frame">
                                      <span className="unit-card-thumb-canvas">
                                        <img
                                          className="unit-card-thumb fallback"
                                          src={getUnitTypeBadgeSrc(unit.tipo, selectedEra)}
                                          alt=""
                                        />
                                      </span>
                                    </span>
                                  </span>
                                  <div className="unit-card-heading">
                                    <div className="unit-card-title-row">
                                      <h4>{unit.nombre}</h4>
                                      {unitCount > 0 ? <span className="army-unit-count-badge">×{unitCount}</span> : null}
                                    </div>
                                    <div className={`unit-card-type unit-type-${getUnitTypeToken(unit.tipo)}${unitIsHero && selectedEra ? ` unit-era-${selectedEra}` : ''}`}>
                                      {unit.tipo}
                                      {selectedEra ? (
                                        <span className="unit-card-era-list">
                                          <span className={`unit-era-badge unit-era-${selectedEra}`}>
                                            {getEraLabel(selectedEra)}
                                          </span>
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="unit-card-inline-value">{displayValue} {t('generator.valueUnit')}</div>
                                  </div>
                                </div>
                                <div className="unit-card-header-actions">
                                  <button
                                    type="button"
                                    className="ghost small"
                                    onClick={() => setOpenManualUnitId(unitKey)}
                                  >
                                    {t('generator.viewCard')}
                                  </button>
                                  <button
                                    type="button"
                                    className="ghost small"
                                    disabled={unitDisabled || isSelectedHero}
                                    title={disabledTitle || undefined}
                                    onClick={() => handleAddArmyUnit(unitKey)}
                                  >
                                    {unitIsHero
                                      ? (isSelectedHero ? t('generator.chosenHeroButton') : t('generator.chooseHeroButton'))
                                      : t('generator.add')}
                                  </button>
                                </div>
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    </div>
                  ) : null)}
                </div>
                ) : null}
                {activeGeneratorSection === 'army' ? (
                  <div id="current-army-panel" className="generator-subsection generator-listing-field army-inline-panel">
                    <div className="army-inline-head">
                      <div>
                        <p className="army-inline-total">
                          <span className="generator-listing-label">{t('generator.currentArmy')}:</span>{' '}
                          {currentArmyTotalValue} {t('generator.valueUnit')}
                        </p>
                      </div>
                    </div>
                    {[
                      { key: 'hero', label: t('generator.requiredHeroSlot'), entries: selectedHeroEntries, groups: null },
                      {
                        key: 'units',
                        label: t('generator.units'),
                        entries: armyRegularUnitGroups ? null : selectedRegularArmyUnits,
                        groups: armyRegularUnitGroups,
                      },
                    ].map((section) => {
                      const hasContent = section.groups ? section.groups.length > 0 : section.entries.length > 0
                      if (!hasContent) return null
                      return (
                        <div className="army-modal-section" key={`current-army-${section.key}`}>
                          <p className="army-modal-section-label">{section.label}</p>
                          <div className="army-list army-list-compact">
                            {section.groups
                              ? section.groups.map(({ entry, count, totalValue, selectionIds }) => (
                                <article key={`current-unit-group-${entry.sourceUid}`} className="unit-card army-unit">
                                  <div className="unit-card-header army-unit-header">
                                    <div className="unit-card-summary army-unit-summary">
                                      <div className="unit-card-thumb-wrap army-unit-image-wrap">
                                        <img
                                          className={`unit-card-thumb army-unit-thumb${entry.imageDataUrl ? '' : ' fallback'}`}
                                          src={entry.imageDataUrl || getUnitTypeBadgeSrc(entry.base.tipo, selectedEra)}
                                          alt={entry.base.nombre}
                                        />
                                        <input
                                          id={`army-unit-image-${entry.uid}`}
                                          type="file"
                                          accept="image/*"
                                          className="unit-image-input"
                                          onChange={(event) => handleArmyUnitImageChange(entry, event)}
                                        />
                                        {entry.imageDataUrl ? (
                                          <button
                                            type="button"
                                            className="unit-image-clear"
                                            onClick={(event) => {
                                              event.stopPropagation()
                                              updateArmyUnitSelection(entry.uid, { imageDataUrl: '' })
                                            }}
                                            aria-label={t('generator.removeImage')}
                                            title={t('generator.removeImage')}
                                          >
                                            ×
                                          </button>
                                        ) : null}
                                      </div>
                                      <div className="unit-card-heading">
                                        <div className="unit-card-title-row">
                                          <h4>{entry.base.nombre}</h4>
                                          {count > 1 ? <span className="army-unit-count-badge">×{count}</span> : null}
                                        </div>
                                        <div className={`unit-card-type unit-type-${getUnitTypeToken(entry.base.tipo)}${isHeroUnit(entry.base) && selectedEra ? ` unit-era-${selectedEra}` : ''}`}>
                                          {entry.base.tipo}
                                          {selectedEra ? (
                                            <span className="unit-card-era-list">
                                              <span className={`unit-era-badge unit-era-${selectedEra}`}>
                                                {getEraLabel(selectedEra)}
                                              </span>
                                            </span>
                                          ) : null}
                                        </div>
                                        <div className="unit-card-inline-value">{totalValue} {t('generator.valueUnit')}</div>
                                      </div>
                                    </div>
                                    <div className="unit-card-header-actions army-unit-actions">
                                      <label
                                        htmlFor={`army-unit-image-${entry.uid}`}
                                        className="ghost small army-unit-image-button"
                                      >
                                        {entry.imageDataUrl ? t('generator.changeImage') : t('generator.addImage')}
                                      </label>
                                      <button
                                        type="button"
                                        className="ghost small"
                                        onClick={() => setOpenArmyUnitUid(entry.uid)}
                                      >
                                        {t('generator.viewCard')}
                                      </button>
                                      <button
                                        type="button"
                                        className="ghost small"
                                        onClick={() => handleRemoveArmyUnit(selectionIds.at(-1))}
                                      >
                                        {t('generator.delete')}
                                      </button>
                                    </div>
                                  </div>
                                </article>
                              ))
                              : section.entries.map((entry) => (
                                <article key={`current-unit-${entry.uid}`} className="unit-card army-unit">
                                  <div className="unit-card-header army-unit-header">
                                    <div className="unit-card-summary army-unit-summary">
                                      <div className="unit-card-thumb-wrap army-unit-image-wrap">
                                        <img
                                          className={`unit-card-thumb army-unit-thumb${entry.imageDataUrl ? '' : ' fallback'}`}
                                          src={entry.imageDataUrl || getUnitTypeBadgeSrc(entry.base.tipo, selectedEra)}
                                          alt={entry.base.nombre}
                                        />
                                        <input
                                          id={`army-unit-image-${entry.uid}`}
                                          type="file"
                                          accept="image/*"
                                          className="unit-image-input"
                                          onChange={(event) => handleArmyUnitImageChange(entry, event)}
                                        />
                                        {entry.imageDataUrl ? (
                                          <button
                                            type="button"
                                            className="unit-image-clear"
                                            onClick={(event) => {
                                              event.stopPropagation()
                                              updateArmyUnitSelection(entry.uid, { imageDataUrl: '' })
                                            }}
                                            aria-label={t('generator.removeImage')}
                                            title={t('generator.removeImage')}
                                          >
                                            ×
                                          </button>
                                        ) : null}
                                      </div>
                                      <div className="unit-card-heading">
                                        <div className="unit-card-title-row">
                                          <h4>{exportUnitDisplayNames.get(entry.uid) || entry.base.nombre}</h4>
                                        </div>
                                        <div className={`unit-card-type unit-type-${getUnitTypeToken(entry.base.tipo)}${isHeroUnit(entry.base) && selectedEra ? ` unit-era-${selectedEra}` : ''}`}>
                                          {entry.base.tipo}
                                          {selectedEra ? (
                                            <span className="unit-card-era-list">
                                              <span className={`unit-era-badge unit-era-${selectedEra}`}>
                                                {getEraLabel(selectedEra)}
                                              </span>
                                            </span>
                                          ) : null}
                                        </div>
                                        <div className="unit-card-inline-value">{entry.total} {t('generator.valueUnit')}</div>
                                      </div>
                                    </div>
                                    <div className="unit-card-header-actions army-unit-actions">
                                      <label
                                        htmlFor={`army-unit-image-${entry.uid}`}
                                        className="ghost small army-unit-image-button"
                                      >
                                        {entry.imageDataUrl ? t('generator.changeImage') : t('generator.addImage')}
                                      </label>
                                      <button
                                        type="button"
                                        className="ghost small"
                                        onClick={() => setOpenArmyUnitUid(entry.uid)}
                                      >
                                        {t('generator.viewCard')}
                                      </button>
                                      <button
                                        type="button"
                                        className="ghost small"
                                        onClick={() => handleRemoveArmyUnit(entry.uid)}
                                      >
                                        {t('generator.delete')}
                                      </button>
                                    </div>
                                  </div>
                                </article>
                              ))}
                          </div>
                        </div>
                      )
                    })}
                    {!selectedArmyUnits.length ? (
                      <p className="empty-state">{t('generator.noUnitsYet')}</p>
                    ) : null}
                    <div className="army-actions">
                      <button
                        type="button"
                        className="primary small"
                        onClick={handleDownloadArmyPdf}
                        disabled={!selectedArmyUnits.length || isArmyPrintPreviewOpen}
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
                      <p className="random-army-error" role="alert" aria-live="polite">
                        {armyDownloadError}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {isRandomArmyModalOpen && typeof document !== 'undefined' ? createPortal(
                  <div
                    className="unit-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-label={t('generator.randomArmy')}
                    onClick={handleCloseRandomArmyModal}
                  >
                    <form className="unit-modal-card random-army-modal-card" onSubmit={handleGenerateRandomArmy} onClick={(event) => event.stopPropagation()}>
                      <div className="unit-modal-header">
                        <div>
                          <p className="eyebrow">{t('generator.randomArmyEyebrow')}</p>
                          <h3>{t('generator.randomArmyTitle')}</h3>
                          <p className="unit-modal-subtitle">
                            {t('generator.randomArmySubtitle')}
                          </p>
                        </div>
                        <button type="button" className="ghost tiny" onClick={handleCloseRandomArmyModal}>
                          {t('generator.close')}
                        </button>
                      </div>
                      <div className="unit-modal-body">
                        <label className="field">
                          <span>{t('generator.randomArmyValueLabel')}</span>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={randomArmyTargetValue}
                            onChange={(event) => {
                              setRandomArmyTargetValue(event.target.value)
                              setRandomArmyError('')
                            }}
                            autoFocus
                          />
                        </label>
                        <p className="random-army-note">
                          {t('generator.randomArmyNote')}
                        </p>
                        {randomArmyError ? <p className="random-army-error">{randomArmyError}</p> : null}
                      </div>
                      <div className="unit-modal-footer">
                        <button type="button" className="ghost small" onClick={handleCloseRandomArmyModal} disabled={isGeneratingArmy}>
                          {t('generator.cancel')}
                        </button>
                        <button type="submit" className="primary small" disabled={isGeneratingArmy} aria-busy={isGeneratingArmy ? 'true' : 'false'}>
                          {isGeneratingArmy ? <SpinnerIcon /> : null}
                          <span>{isGeneratingArmy ? t('generator.randomArmyGenerating') : t('generator.randomArmyGenerate')}</span>
                        </button>
                      </div>
                    </form>
                  </div>,
                  document.body,
                ) : null}

                {pendingSquadUnitId && typeof document !== 'undefined' ? (() => {
                  const unitEntry = exportUnits.find((entry) => entry.uid === pendingSquadUnitId)
                  if (!unitEntry) return null
                  const min = clampSquadSize(unitEntry.base.escuadra_min, unitEntry.base)
                  const max = clampSquadSize(unitEntry.base.escuadra_max, unitEntry.base)
                  const sizeOptions = Array.from({ length: Math.max(1, max - min + 1) }, (_, index) => min + index)
                  const fixedLoadout = getFixedUnitLoadout(unitEntry.base, selectedEra)
                  const selectedSquadValue = computeUnitTotal(
                    unitEntry.base,
                    fixedLoadout.shooting,
                    fixedLoadout.melee,
                    clampSquadSize(pendingSquadSize, unitEntry.base),
                    null,
                    gameMode,
                  )

                  return createPortal(
                    <div
                      className="unit-modal"
                      role="dialog"
                      aria-modal="true"
                      aria-label={t('generator.squadSize')}
                      onClick={handleCloseSquadSizeModal}
                    >
                      <div className="unit-modal-card squad-size-modal-card" onClick={(event) => event.stopPropagation()}>
                        <div className="unit-modal-header">
                          <div>
                            <p className="eyebrow">{t('generator.squadLabel')}</p>
                            <h3>{unitEntry.base.nombre}</h3>
                            <p className="unit-modal-subtitle">
                              {t('generator.squadSizeModalSubtitle').replace('{min}', String(min)).replace('{max}', String(max))}
                            </p>
                          </div>
                          <button type="button" className="ghost tiny" onClick={handleCloseSquadSizeModal}>
                            {t('generator.close')}
                          </button>
                        </div>
                        <div className="squad-size-options" role="radiogroup" aria-label={t('generator.squadSize')}>
                          {sizeOptions.map((size) => (
                            <button
                              type="button"
                              key={`squad-size-${unitEntry.uid}-${size}`}
                              className={`squad-size-option${pendingSquadSize === size ? ' active' : ''}`}
                              aria-pressed={pendingSquadSize === size}
                              onClick={() => setPendingSquadSize(size)}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                        <p className="squad-size-total-preview">
                          <span>{selectedSquadValue}</span> {t('generator.valueUnit')}
                        </p>
                        <div className="unit-modal-footer">
                          <button type="button" className="ghost small" onClick={handleCloseSquadSizeModal}>
                            {t('generator.cancel')}
                          </button>
                          <button type="button" className="primary small" onClick={handleConfirmSquadSize}>
                            {t('generator.add')}
                          </button>
                        </div>
                      </div>
                    </div>,
                    document.body,
                  )
                })() : null}

                {/* Modal de vista previa de ficha */}
                {openManualUnitId || openArmyUnitUid ? (() => {
                  const previewEntry = openArmyUnitUid ? selectedArmyUnits.find((entry) => entry.uid === openArmyUnitUid) : null
                  const previewUnit = previewEntry?.base || visibleManualUnits.find((u) => (u.generatorUid || u.id) === openManualUnitId)
                  if (!previewUnit) return null
                  const previewSourceUid = previewEntry?.sourceUid || previewUnit?.generatorUid || previewUnit?.id
                  const previewGroup = armyRegularUnitGroups?.find((g) => g.entry.sourceUid === previewSourceUid) ?? null
                  const previewDraft = getManualUnitDraft(previewUnit)
                  const previewLoadout = previewEntry || getFixedUnitLoadout(previewUnit, selectedEra)
                  const previewTotal = previewEntry?.total || computeUnitTotal(
                    previewUnit,
                    previewLoadout.shooting,
                    previewLoadout.melee,
                    previewDraft.squadSize,
                    null,
                    gameMode,
                  )
                  const previewValue = getUnitFichaValue(previewUnit, gameMode, previewTotal)
                  const previewDisplayName = previewEntry
                    ? exportUnitDisplayNames.get(previewEntry.uid) || previewUnit.nombre
                    : previewUnit.nombre
                  const previewEraLabel = selectedEra ? getEraLabel(selectedEra) : ''
                  const closePreview = () => {
                    setOpenManualUnitId('')
                    setOpenArmyUnitUid('')
                  }
                  return typeof document !== 'undefined' ? createPortal(
                    <div
                      className="unit-preview-modal"
                      role="dialog"
                      aria-modal="true"
                      aria-label={previewDisplayName}
                      onClick={closePreview}
                    >
                      <div className="unit-preview-modal-inner" onClick={(e) => e.stopPropagation()}>
                        <div className="unit-preview-modal-bar">
                          <div className="unit-preview-modal-actions">
                            <button
                              type="button"
                              className="ghost small"
                              onClick={closePreview}
                              aria-label={t('generator.close')}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        <div className="unit-preview-modal-card">
                          <UnitFichaCard
                            unit={{
                              ...previewUnit,
                              nombre: previewDisplayName,
                              armas_disparo: previewLoadout.shooting,
                              armas_melee: previewLoadout.meleeList || [],
                              valor_base: previewValue,
                              escuadra_display: gameMode === 'escaramuza'
                                ? (previewEntry
                                  ? `×${previewGroup?.count ?? 1}`
                                  : getSquadFichaValue(previewUnit, gameMode, previewDraft.squadSize))
                                : previewEntry
                                  ? getSquadFichaValue(previewUnit, gameMode, previewEntry.squadSize ?? previewDraft.squadSize)
                                  : undefined,
                            }}
                            factionId={selectedFaction?.id}
                            imageDataUrl={previewEntry?.imageDataUrl || ''}
                            gameMode={gameMode}
                            eraLabel={previewEraLabel}
                            lang={lang}
                          />
                        </div>
                      </div>
                    </div>,
                    document.body,
                  ) : null
                })() : null}
              </>
            )}
          </div>
        </div>
      </div>
      {isArmyPrintPreviewOpen ? (
        <div ref={armyExportStageRef} className="army-export-stage army-export-stage-hidden" aria-hidden="true">
          {armyExportPages
            ? armyExportPages.map((pageEntries, pageIndex) => (
                <div
                  key={`army-export-page-${pageIndex}`}
                  ref={(node) => setArmySheetRef(`page-${pageIndex}`, node)}
                  className="army-export-sheet army-export-sheet-cards"
                >
                  {pageEntries.map((entry, cardIndex) => {
                    const cardKey = `unit-${pageIndex}-${entry.uid || cardIndex}`
                    const displayName = exportUnitDisplayNames.get(entry.uid) || entry.base.nombre
                    const unitEraLabel = selectedEra ? getEraLabel(selectedEra) : ''

                    return (
                      <div key={`army-export-${entry.uid}`} className="army-export-sheet-slot" data-army-export-slot={entry.uid}>
                        <div className="army-export-card-host">
                          <UnitFichaCard
                            ref={(node) => setArmyCardRef(cardKey, node)}
                            unit={{
                              ...entry.base,
                              nombre: displayName,
                              armas_disparo: entry.shooting,
                              armas_melee: entry.meleeList || [],
                              valor_base: getUnitFichaValue(entry.base, gameMode, entry.total),
                              escuadra_display: gameMode === 'escaramuza'
                                ? `×${entry._count ?? 1}`
                                : getSquadFichaValue(entry.base, gameMode, entry.squadSize),
                            }}
                            factionId={selectedFaction?.id}
                            imageDataUrl={entry.imageDataUrl}
                            gameMode={gameMode}
                            eraLabel={unitEraLabel}
                            lang={lang}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))
            : null}
        </div>
      ) : null}
      {imageCropDraft && typeof document !== 'undefined'
        ? createPortal(
            <div className="unit-modal" role="dialog" aria-modal="true" onClick={handleCancelImageCrop}>
              <div className="unit-modal-card image-crop-modal-card" onClick={(event) => event.stopPropagation()}>
                <div className="unit-modal-header">
                  <div>
                    <p className="eyebrow">{imageCropDraft.unitName}</p>
                    <h3>{t('generator.cropImageTitle')}</h3>
                    <p className="unit-modal-subtitle">{t('generator.cropImageHint')}</p>
                  </div>
                  <button type="button" className="ghost small" onClick={handleCancelImageCrop}>
                    {t('generator.close')}
                  </button>
                </div>
                <div className="unit-modal-body image-crop-modal-body">
                  <div
                    className="image-crop-stage"
                    onPointerDown={handleImageCropPointerDown}
                    role="presentation"
                    style={{
                      width: `${IMAGE_CROP_VIEWPORT_WIDTH}px`,
                      height: `${IMAGE_CROP_VIEWPORT_HEIGHT}px`,
                    }}
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
                    <button type="button" className="ghost small" onClick={handleCancelImageCrop}>
                      {t('generator.cancel')}
                    </button>
                    <button type="button" className="primary" onClick={handleConfirmImageCrop}>
                      {t('generator.confirmCropImage')}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  )
}

export default Generador
